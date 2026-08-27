import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createDemoSource } from './demoSource'
import type { MarketUpdate } from '../domain/types'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createDemoSource', () => {
  it('emits demo status immediately and books on interval', () => {
    const updates: MarketUpdate[] = []
    const unsub = createDemoSource(250).subscribe({ next: (u) => updates.push(u) })
    expect(updates[0]).toEqual({ type: 'status', status: 'demo' })
    vi.advanceTimersByTime(250)
    const book = updates.find((u) => u.type === 'book')!
    expect(book.bids).toHaveLength(30)
    expect(book.asks).toHaveLength(30)
    // биды по убыванию, аски по возрастанию, спред положительный
    expect(book.bids[0]!.price).toBeGreaterThan(book.bids[1]!.price)
    expect(book.asks[0]!.price).toBeLessThan(book.asks[1]!.price)
    expect(book.asks[0]!.price).toBeGreaterThan(book.bids[0]!.price)
    unsub()
  })

  it('stops emitting after unsubscribe', () => {
    const updates: MarketUpdate[] = []
    const unsub = createDemoSource(250).subscribe({ next: (u) => updates.push(u) })
    unsub()
    const count = updates.length
    vi.advanceTimersByTime(5000)
    expect(updates.length).toBe(count)
  })
})
