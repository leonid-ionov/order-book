import type { PriceLevel } from '../domain/types'

export const BOOK_DEPTH = 15

/** Minimum bar width so thin levels stay visible. */
const MIN_DEPTH = 0.03

export interface DepthRow {
  price: number
  size: number
  /** Cumulative size from the best level down to this one. */
  total: number
  /** Bar width as a share of the side total, MIN_DEPTH..1. */
  depth: number
}

export function toDepthRows(levels: PriceLevel[], limit = BOOK_DEPTH): DepthRow[] {
  const slice = levels.slice(0, limit)
  let total = 0
  const totals = slice.map((level) => (total += level.size))
  return slice.map((level, i) => {
    const cumulative = totals[i] ?? 0
    return {
      price: level.price,
      size: level.size,
      total: cumulative,
      depth: total > 0 ? Math.max(MIN_DEPTH, cumulative / total) : MIN_DEPTH,
    }
  })
}

export function spreadOf(bids: PriceLevel[], asks: PriceLevel[]): number | null {
  const bestBid = bids[0]
  const bestAsk = asks[0]
  if (!bestBid || !bestAsk) return null
  return bestAsk.price - bestBid.price
}
