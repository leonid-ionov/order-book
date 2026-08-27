import { describe, it, expect, vi } from 'vitest'
import { withDemoFallback } from './withDemoFallback'
import type { MarketDataSource, MarketObserver, MarketUpdate } from '../domain/types'

function manualSource() {
  let observer: MarketObserver | null = null
  const unsubscribe = vi.fn(() => {
    observer = null
  })
  const source: MarketDataSource = {
    subscribe(obs) {
      observer = obs
      return unsubscribe
    },
  }
  return {
    source,
    unsubscribe,
    emit: (u: MarketUpdate) => observer?.next(u),
    fail: (e: unknown) => observer?.error?.(e),
    get subscribed() {
      return observer !== null
    },
  }
}

describe('withDemoFallback', () => {
  it('proxies primary updates', () => {
    const primary = manualSource()
    const demo = manualSource()
    const updates: MarketUpdate[] = []
    withDemoFallback(primary.source, demo.source).subscribe({ next: (u) => updates.push(u) })
    primary.emit({ type: 'status', status: 'live' })
    expect(updates).toEqual([{ type: 'status', status: 'live' }])
    expect(demo.subscribed).toBe(false)
  })

  it('switches to demo when primary errors', () => {
    const primary = manualSource()
    const demo = manualSource()
    const updates: MarketUpdate[] = []
    withDemoFallback(primary.source, demo.source).subscribe({ next: (u) => updates.push(u) })
    primary.fail(new Error('dead'))
    expect(primary.unsubscribe).toHaveBeenCalled()
    expect(demo.subscribed).toBe(true)
    demo.emit({ type: 'status', status: 'demo' })
    expect(updates).toContainEqual({ type: 'status', status: 'demo' })
  })

  it('unsubscribe tears down whichever source is active', () => {
    const primary = manualSource()
    const demo = manualSource()
    const wrapped = withDemoFallback(primary.source, demo.source)
    const unsub = wrapped.subscribe({ next: () => {} })
    primary.fail(new Error('dead'))
    unsub()
    expect(demo.subscribed).toBe(false)
  })

  it('does not subscribe demo after teardown when primary errors late', () => {
    const demo = manualSource()
    const captured: { observer: MarketObserver | null } = { observer: null }
    const spySource: MarketDataSource = {
      subscribe(obs) {
        captured.observer = obs
        return () => {}
      },
    }
    const unsub = withDemoFallback(spySource, demo.source).subscribe({ next: () => {} })
    unsub()
    captured.observer?.error?.(new Error('late'))
    expect(demo.subscribed).toBe(false)
  })
})
