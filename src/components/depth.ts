import type { PriceLevel } from '../domain/types'

/** Сколько уровней на сторону показывает лестница (стор держит больше). */
export const BOOK_DEPTH = 15

/** Минимальная ширина бара, чтобы тонкие уровни не пропадали. */
const MIN_DEPTH = 0.03

export interface DepthRow {
  price: number
  size: number
  /** Накопленный объём от лучшего уровня до текущего. */
  total: number
  /** Ширина бара: доля от итога стороны, MIN_DEPTH..1. */
  depth: number
}

/** Строки лестницы для одной стороны. Порядок как на входе — от лучшего уровня. */
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
