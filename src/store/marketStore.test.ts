import { describe, it, expect, beforeEach } from 'vitest'
import { useMarketStore, connectStore } from './marketStore'
import type { MarketDataSource, MarketObserver } from '../domain/types'

function manualSource() {
  let observer: MarketObserver | null = null
  const source: MarketDataSource = {
    subscribe(obs) {
      observer = obs
      return () => {
        observer = null
      }
    },
  }
  return { source, emit: (u: Parameters<MarketObserver['next']>[0]) => observer?.next(u) }
}

function manualScheduler() {
  const queue: (() => void)[] = []
  return {
    schedule: (cb: () => void) => queue.push(cb),
    flush: () => {
      while (queue.length) queue.shift()!()
    },
    get pending() {
      return queue.length
    },
  }
}

beforeEach(() => {
  useMarketStore.setState({ bids: [], asks: [], ticker: null, status: 'loading' })
})

describe('connectStore', () => {
  it('coalesces multiple updates into one flush per frame with latest values', () => {
    const { source, emit } = manualSource()
    const sched = manualScheduler()
    connectStore(source, sched.schedule)

    emit({ type: 'book', bids: [{ price: 1, size: 1 }], asks: [] })
    emit({ type: 'book', bids: [{ price: 2, size: 2 }], asks: [] })
    emit({ type: 'ticker', ticker: { lastPrice: 5, changePercent24h: 0, volume24h: 0 } })

    // до кадра — стор не тронут, запланирован ровно один flush
    expect(useMarketStore.getState().bids).toEqual([])
    expect(sched.pending).toBe(1)

    sched.flush()
    const state = useMarketStore.getState()
    expect(state.bids).toEqual([{ price: 2, size: 2 }]) // последнее значение
    expect(state.ticker?.lastPrice).toBe(5)
  })

  it('applies status updates', () => {
    const { source, emit } = manualSource()
    const sched = manualScheduler()
    connectStore(source, sched.schedule)
    emit({ type: 'status', status: 'live' })
    sched.flush()
    expect(useMarketStore.getState().status).toBe('live')
  })

  it('teardown stops applying pending updates', () => {
    const { source, emit } = manualSource()
    const sched = manualScheduler()
    const teardown = connectStore(source, sched.schedule)
    emit({ type: 'status', status: 'live' })
    teardown()
    sched.flush()
    expect(useMarketStore.getState().status).toBe('loading')
  })
})
