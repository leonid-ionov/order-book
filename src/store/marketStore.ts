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

/** Batches source updates into one setState per animation frame, however many messages arrive in between. */
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
