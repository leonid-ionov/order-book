import { describe, it, expect } from 'vitest'
import { BOOK_DEPTH, spreadOf, toDepthRows } from './depth'

const levels = (sizes: number[]) => sizes.map((size, i) => ({ price: 100 - i, size }))

describe('toDepthRows', () => {
  it('accumulates totals and scales depth to the side total', () => {
    const rows = toDepthRows([
      { price: 100, size: 1 },
      { price: 99, size: 3 },
    ])
    expect(rows.map((r) => r.total)).toEqual([1, 4])
    expect(rows.map((r) => r.depth)).toEqual([0.25, 1])
  })

  it('cuts the side to BOOK_DEPTH levels', () => {
    expect(BOOK_DEPTH).toBe(15)
    expect(toDepthRows(levels(Array(20).fill(1)))).toHaveLength(15)
  })

  it('renders fewer levels as is, scaled to their own total', () => {
    const rows = toDepthRows(levels([1, 1]))
    expect(rows).toHaveLength(2)
    expect(rows[1]?.depth).toBe(1)
  })

  it('keeps the minimum bar width when the side total is zero', () => {
    expect(toDepthRows([{ price: 1, size: 0 }])[0]?.depth).toBe(0.03)
  })

  it('clamps tiny bars to 3%', () => {
    expect(toDepthRows(levels([0.01, 99.99]))[0]?.depth).toBe(0.03)
  })
})

describe('spreadOf', () => {
  it('is best ask minus best bid', () => {
    expect(spreadOf([{ price: 99, size: 1 }], [{ price: 101, size: 1 }])).toBe(2)
  })

  it('is null when a side is empty', () => {
    expect(spreadOf([], [{ price: 101, size: 1 }])).toBeNull()
    expect(spreadOf([{ price: 99, size: 1 }], [])).toBeNull()
  })
})
