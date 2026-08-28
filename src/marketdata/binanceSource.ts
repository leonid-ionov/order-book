import type { BookSnapshot, MarketDataSource, MarketObserver } from '../domain/types'
import { ReconnectingSocket, type SocketFactory } from './connection'
import { normalizeSnapshot, parseStreamMessage, type RawSnapshot } from './normalizer'
import { OrderBookReconciler } from './reconciler'

export const BINANCE_WS_URL =
  'wss://stream.binance.com:9443/stream?streams=btcusdt@depth@100ms/btcusdt@ticker'
export const BINANCE_SNAPSHOT_URL =
  'https://data-api.binance.vision/api/v3/depth?symbol=BTCUSDT&limit=1000'

async function defaultFetchSnapshot(): Promise<BookSnapshot> {
  const res = await fetch(BINANCE_SNAPSHOT_URL)
  if (!res.ok) throw new Error(`snapshot fetch failed: HTTP ${res.status}`)
  return normalizeSnapshot((await res.json()) as RawSnapshot)
}

export interface BinanceSourceOpts {
  createSocket?: SocketFactory
  fetchSnapshot?: () => Promise<BookSnapshot>
  maxReconnectAttempts?: number
  maxSnapshotAttempts?: number
  snapshotRetryMs?: number
  topN?: number
}

/**
 * Фасад над Connection + Normalizer + Reconciler.
 * Наружу — только поток нормализованных MarketUpdate (шов MarketDataSource).
 */
export function createBinanceSource(opts: BinanceSourceOpts = {}): MarketDataSource {
  const fetchSnapshot = opts.fetchSnapshot ?? defaultFetchSnapshot
  const maxReconnectAttempts = opts.maxReconnectAttempts ?? 5
  const maxSnapshotAttempts = opts.maxSnapshotAttempts ?? 5
  const retryMs = opts.snapshotRetryMs ?? 1000
  const topN = opts.topN ?? 30

  return {
    subscribe(observer: MarketObserver): () => void {
      const reconciler = new OrderBookReconciler()
      let synced = false
      let epoch = 0 // инвалидирует снапшоты/ретраи в полёте
      let stopped = false
      let socket: ReconnectingSocket

      const emitBook = () =>
        observer.next({ type: 'book', bids: reconciler.topBids(topN), asks: reconciler.topAsks(topN) })

      const loadSnapshot = async (myEpoch: number, attempt = 1): Promise<void> => {
        try {
          const snapshot = await fetchSnapshot()
          if (stopped || myEpoch !== epoch) return
          if (reconciler.applySnapshot(snapshot) === 'gap') {
            reconciler.reset()
            void loadSnapshot(myEpoch)
            return
          }
          synced = true
          observer.next({ type: 'status', status: 'live' })
          emitBook()
        } catch {
          if (stopped || myEpoch !== epoch) return
          if (attempt >= maxSnapshotAttempts) {
            stopped = true
            epoch++
            socket.close()
            observer.error?.(new Error(`snapshot fetch failed after ${attempt} attempts`))
            return
          }
          setTimeout(() => {
            if (!stopped && myEpoch === epoch) void loadSnapshot(myEpoch, attempt + 1)
          }, retryMs)
        }
      }

      const resync = (): void => {
        synced = false
        reconciler.reset()
        observer.next({ type: 'status', status: 'loading' })
        void loadSnapshot(++epoch)
      }

      socket = new ReconnectingSocket(
        BINANCE_WS_URL,
        {
          onUp: () => resync(),
          onDown: (attempt) => {
            synced = false
            reconciler.reset()
            epoch++
            if (attempt >= maxReconnectAttempts) {
              socket.close()
              observer.error?.(new Error(`connection failed after ${attempt} attempts`))
            } else {
              observer.next({ type: 'status', status: 'loading' })
            }
          },
          onMessage: (data) => {
            if (stopped) return
            const msg = parseStreamMessage(data)
            if (!msg) return
            if (msg.kind === 'ticker') {
              observer.next({ type: 'ticker', ticker: msg.ticker })
              return
            }
            if (!synced) {
              reconciler.bufferDelta(msg.delta)
              return
            }
            const result = reconciler.applyDelta(msg.delta)
            if (result === 'applied') emitBook()
            else if (result === 'gap') resync()
          },
        },
        { createSocket: opts.createSocket },
      )

      socket.connect()
      return () => {
        stopped = true
        epoch++
        socket.close()
      }
    },
  }
}
