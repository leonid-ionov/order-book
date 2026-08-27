import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBinanceSource } from './binanceSource'
import type { SocketLike } from './connection'
import type { BookSnapshot, MarketUpdate } from '../domain/types'

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  close() {}
}

const depthMsg = (U: number, u: number, bids: [string, string][] = [], asks: [string, string][] = []) =>
  JSON.stringify({ stream: 'btcusdt@depth@100ms', data: { e: 'depthUpdate', U, u, b: bids, a: asks } })

const tickerMsg = () =>
  JSON.stringify({ stream: 'btcusdt@ticker', data: { e: '24hrTicker', c: '50000', P: '1.5', v: '999' } })

const SNAPSHOT: BookSnapshot = {
  lastUpdateId: 100,
  bids: [{ price: 99, size: 1 }],
  asks: [{ price: 101, size: 1 }],
}

function setup(opts: { fetchSnapshot?: () => Promise<BookSnapshot>; maxReconnectAttempts?: number } = {}) {
  const sockets: FakeSocket[] = []
  const updates: MarketUpdate[] = []
  const errors: unknown[] = []
  const fetchSnapshot = opts.fetchSnapshot ?? vi.fn(async () => SNAPSHOT)
  const source = createBinanceSource({
    createSocket: () => {
      const s = new FakeSocket()
      sockets.push(s)
      return s
    },
    fetchSnapshot,
    maxReconnectAttempts: opts.maxReconnectAttempts ?? 5,
    snapshotRetryMs: 1000,
  })
  const unsubscribe = source.subscribe({
    next: (u) => updates.push(u),
    error: (e) => errors.push(e),
  })
  return { sockets, updates, errors, unsubscribe, fetchSnapshot }
}

const flushMicrotasks = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createBinanceSource', () => {
  it('buffers deltas, applies snapshot, then emits live + book', async () => {
    const { sockets, updates } = setup()
    const ws = sockets[0]!
    ws.onopen!()
    // дельта пришла ДО снапшота — буферизуется
    ws.onmessage!({ data: depthMsg(101, 101, [['99', '7']]) })
    await flushMicrotasks()
    expect(updates).toContainEqual({ type: 'status', status: 'loading' })
    expect(updates).toContainEqual({ type: 'status', status: 'live' })
    const book = updates.filter((u) => u.type === 'book').at(-1)!
    expect(book).toEqual({
      type: 'book',
      bids: [{ price: 99, size: 7 }],
      asks: [{ price: 101, size: 1 }],
    })
  })

  it('emits book update per applied delta and skips stale silently', async () => {
    const { sockets, updates } = setup()
    const ws = sockets[0]!
    ws.onopen!()
    await flushMicrotasks()
    const booksBefore = updates.filter((u) => u.type === 'book').length
    ws.onmessage!({ data: depthMsg(90, 95) }) // stale
    ws.onmessage!({ data: depthMsg(101, 102, [['98', '5']]) })
    const books = updates.filter((u) => u.type === 'book')
    expect(books.length).toBe(booksBefore + 1)
    expect(books.at(-1)!.bids).toEqual([
      { price: 99, size: 1 },
      { price: 98, size: 5 },
    ])
  })

  it('passes ticker through', async () => {
    const { sockets, updates } = setup()
    sockets[0]!.onopen!()
    await flushMicrotasks()
    sockets[0]!.onmessage!({ data: tickerMsg() })
    expect(updates).toContainEqual({
      type: 'ticker',
      ticker: { lastPrice: 50000, changePercent24h: 1.5, volume24h: 999 },
    })
  })

  it('resyncs on gap: refetches snapshot', async () => {
    const fetchSnapshot = vi.fn(async () => SNAPSHOT)
    const { sockets, updates } = setup({ fetchSnapshot })
    sockets[0]!.onopen!()
    await flushMicrotasks()
    expect(fetchSnapshot).toHaveBeenCalledTimes(1)
    sockets[0]!.onmessage!({ data: depthMsg(200, 201) }) // разрыв нумерации
    await flushMicrotasks()
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
    expect(updates.filter((u) => u.type === 'status' && u.status === 'live')).toHaveLength(2)
  })

  it('retries snapshot fetch on failure', async () => {
    const fetchSnapshot = vi
      .fn<() => Promise<BookSnapshot>>()
      .mockRejectedValueOnce(new Error('http 500'))
      .mockResolvedValue(SNAPSHOT)
    const { sockets, updates } = setup({ fetchSnapshot })
    sockets[0]!.onopen!()
    await flushMicrotasks()
    expect(updates.some((u) => u.type === 'status' && u.status === 'live')).toBe(false)
    await vi.advanceTimersByTimeAsync(1000)
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
    expect(updates.some((u) => u.type === 'status' && u.status === 'live')).toBe(true)
  })

  it('calls observer.error after maxReconnectAttempts consecutive failures', async () => {
    const { sockets, errors } = setup({ maxReconnectAttempts: 2 })
    sockets[0]!.onclose!() // attempt 1
    await vi.advanceTimersByTimeAsync(1000)
    sockets[1]!.onclose!() // attempt 2 → error
    expect(errors).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(60000)
    expect(sockets).toHaveLength(2) // реконнекты остановлены
  })

  it('resyncs from scratch after reconnect', async () => {
    const fetchSnapshot = vi.fn(async () => SNAPSHOT)
    const { sockets, updates } = setup({ fetchSnapshot })
    sockets[0]!.onopen!()
    await flushMicrotasks()
    sockets[0]!.onclose!()
    expect(updates.at(-1)).toEqual({ type: 'status', status: 'loading' })
    await vi.advanceTimersByTimeAsync(1000)
    sockets[1]!.onopen!()
    await flushMicrotasks()
    expect(fetchSnapshot).toHaveBeenCalledTimes(2)
  })

  it('unsubscribe ignores in-flight snapshot', async () => {
    let resolve!: (s: BookSnapshot) => void
    const fetchSnapshot = vi.fn(() => new Promise<BookSnapshot>((r) => (resolve = r)))
    const { sockets, updates, unsubscribe } = setup({ fetchSnapshot })
    sockets[0]!.onopen!()
    unsubscribe()
    resolve(SNAPSHOT)
    await flushMicrotasks()
    expect(updates.some((u) => u.type === 'status' && u.status === 'live')).toBe(false)
  })

  it('ignores messages arriving after unsubscribe', async () => {
    const { sockets, updates, unsubscribe } = setup()
    sockets[0]!.onopen!()
    await vi.advanceTimersByTimeAsync(0)
    const countBefore = updates.length
    unsubscribe()
    sockets[0]!.onmessage!({ data: tickerMsg() })
    sockets[0]!.onmessage!({ data: depthMsg(101, 102, [['98', '5']]) })
    expect(updates.length).toBe(countBefore)
  })
})
