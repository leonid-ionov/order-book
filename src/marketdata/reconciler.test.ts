import { describe, it, expect } from 'vitest'
import { OrderBookReconciler } from './reconciler'
import type { BookSnapshot, DepthDelta } from '../domain/types'

const snapshot = (over: Partial<BookSnapshot> = {}): BookSnapshot => ({
  lastUpdateId: 100,
  bids: [
    { price: 99, size: 1 },
    { price: 98, size: 2 },
  ],
  asks: [
    { price: 101, size: 1 },
    { price: 102, size: 2 },
  ],
  ...over,
})

const delta = (over: Partial<DepthDelta> = {}): DepthDelta => ({
  firstUpdateId: 101,
  lastUpdateId: 101,
  bids: [],
  asks: [],
  ...over,
})

describe('OrderBookReconciler — snapshot + deltas', () => {
  it('applying a delta updates and adds levels', () => {
    const book = new OrderBookReconciler()
    book.applySnapshot(snapshot())
    const result = book.applyDelta(
      delta({ bids: [{ price: 99, size: 5 }, { price: 97, size: 3 }] }),
    )
    expect(result).toBe('applied')
    expect(book.topBids(10)).toEqual([
      { price: 99, size: 5 },
      { price: 98, size: 2 },
      { price: 97, size: 3 },
    ])
  })

  it('size 0 removes the level', () => {
    const book = new OrderBookReconciler()
    book.applySnapshot(snapshot())
    book.applyDelta(delta({ asks: [{ price: 101, size: 0 }] }))
    expect(book.topAsks(10)).toEqual([{ price: 102, size: 2 }])
  })

  it('returns top-N in correct order: bids desc, asks asc', () => {
    const book = new OrderBookReconciler()
    book.applySnapshot(
      snapshot({
        bids: [
          { price: 97, size: 1 },
          { price: 99, size: 1 },
          { price: 98, size: 1 },
        ],
        asks: [
          { price: 103, size: 1 },
          { price: 101, size: 1 },
          { price: 102, size: 1 },
        ],
      }),
    )
    expect(book.topBids(2).map((l) => l.price)).toEqual([99, 98])
    expect(book.topAsks(2).map((l) => l.price)).toEqual([101, 102])
  })
})

describe('OrderBookReconciler — buffering and resync', () => {
  it('drops events older than the snapshot', () => {
    const book = new OrderBookReconciler()
    book.applySnapshot(snapshot({ lastUpdateId: 100 }))
    const result = book.applyDelta(
      delta({ firstUpdateId: 95, lastUpdateId: 100, bids: [{ price: 99, size: 999 }] }),
    )
    expect(result).toBe('stale')
    expect(book.topBids(1)).toEqual([{ price: 99, size: 1 }]) // не изменился
  })

  it('signals gap when update ids are not contiguous', () => {
    const book = new OrderBookReconciler()
    book.applySnapshot(snapshot({ lastUpdateId: 100 }))
    const result = book.applyDelta(delta({ firstUpdateId: 105, lastUpdateId: 106 }))
    expect(result).toBe('gap')
  })

  it('buffered deltas are drained on snapshot: stale dropped, rest applied', () => {
    const book = new OrderBookReconciler()
    book.bufferDelta(delta({ firstUpdateId: 98, lastUpdateId: 100, bids: [{ price: 99, size: 999 }] })) // stale
    book.bufferDelta(delta({ firstUpdateId: 101, lastUpdateId: 101, bids: [{ price: 99, size: 7 }] }))
    expect(book.applySnapshot(snapshot({ lastUpdateId: 100 }))).toBe('applied')
    expect(book.topBids(1)).toEqual([{ price: 99, size: 7 }])
  })

  it('returns gap from applySnapshot when buffer does not connect', () => {
    const book = new OrderBookReconciler()
    book.bufferDelta(delta({ firstUpdateId: 110, lastUpdateId: 111 }))
    expect(book.applySnapshot(snapshot({ lastUpdateId: 100 }))).toBe('gap')
  })

  it('reset clears book and buffer', () => {
    const book = new OrderBookReconciler()
    book.bufferDelta(delta({ firstUpdateId: 101, lastUpdateId: 101, bids: [{ price: 99, size: 7 }] }))
    book.applySnapshot(snapshot())
    book.reset()
    expect(book.topBids(10)).toEqual([])
    expect(book.topAsks(10)).toEqual([])
    // после reset старый буфер не должен применяться к новому снапшоту
    expect(book.applySnapshot(snapshot({ lastUpdateId: 200 }))).toBe('applied')
    expect(book.topBids(1)).toEqual([{ price: 99, size: 1 }])
  })
})
