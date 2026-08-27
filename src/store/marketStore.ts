import { create } from 'zustand'
import type { FeedStatus, MarketDataSource, PriceLevel, Ticker } from '../domain/types'

export interface MarketState {
  bids: PriceLevel[]
  asks: PriceLevel[]
  ticker: Ticker | null
  status: FeedStatus
}

export const useMarketStore = create<MarketState>(() => ({
  bids: [],
  asks: [],
  ticker: null,
  status: 'loading',
}))

type Schedule = (cb: () => void) => void
const rafSchedule: Schedule = (cb) => requestAnimationFrame(() => cb())

/**
 * Подписывает стор на источник. Перф-приём: апдейты копятся и применяются
 * ОДНИМ setState на кадр (RAF) — сколько бы сообщений ни пришло между кадрами.
 */
export function connectStore(source: MarketDataSource, schedule: Schedule = rafSchedule): () => void {
  let pending: Partial<MarketState> = {}
  let scheduled = false
  let stopped = false

  const flush = (): void => {
    scheduled = false
    if (stopped) return
    const batch = pending
    pending = {}
    useMarketStore.setState(batch)
  }

  const unsubscribe = source.subscribe({
    next: (update) => {
      if (update.type === 'book') {
        pending.bids = update.bids
        pending.asks = update.asks
      } else if (update.type === 'ticker') {
        pending.ticker = update.ticker
      } else {
        pending.status = update.status
      }
      if (!scheduled) {
        scheduled = true
        schedule(flush)
      }
    },
  })

  return () => {
    stopped = true
    unsubscribe()
  }
}
