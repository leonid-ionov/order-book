import type { BookSnapshot, DepthDelta, PriceLevel } from '../domain/types'

export type ApplyResult = 'applied' | 'stale' | 'gap'

/**
 * Ядро стакана: Map<price, size> для каждой стороны.
 * Чистый и детерминированный: без сети, без таймеров — всё подаётся снаружи.
 */
export class OrderBookReconciler {
  private bids = new Map<number, number>()
  private asks = new Map<number, number>()
  private lastUpdateId = 0
  private buffer: DepthDelta[] = []

  bufferDelta(delta: DepthDelta): void {
    this.buffer.push(delta)
  }

  reset(): void {
    this.bids.clear()
    this.asks.clear()
    this.buffer = []
    this.lastUpdateId = 0
  }

  applySnapshot(snapshot: BookSnapshot): 'applied' | 'gap' {
    this.bids = new Map(snapshot.bids.map((l) => [l.price, l.size]))
    this.asks = new Map(snapshot.asks.map((l) => [l.price, l.size]))
    this.lastUpdateId = snapshot.lastUpdateId
    const buffered = this.buffer
    this.buffer = []
    for (const delta of buffered) {
      if (this.applyDelta(delta) === 'gap') return 'gap'
    }
    return 'applied'
  }

  applyDelta(delta: DepthDelta): ApplyResult {
    if (delta.lastUpdateId <= this.lastUpdateId) return 'stale'
    if (delta.firstUpdateId > this.lastUpdateId + 1) return 'gap'
    applyLevels(this.bids, delta.bids)
    applyLevels(this.asks, delta.asks)
    this.lastUpdateId = delta.lastUpdateId
    return 'applied'
  }

  topBids(n: number): PriceLevel[] {
    return top(this.bids, n, (a, b) => b - a)
  }

  topAsks(n: number): PriceLevel[] {
    return top(this.asks, n, (a, b) => a - b)
  }
}

function applyLevels(side: Map<number, number>, levels: PriceLevel[]): void {
  for (const { price, size } of levels) {
    if (size === 0) side.delete(price)
    else side.set(price, size)
  }
}

function top(
  side: Map<number, number>,
  n: number,
  cmp: (a: number, b: number) => number,
): PriceLevel[] {
  return [...side.keys()]
    .sort(cmp)
    .slice(0, n)
    .map((price) => ({ price, size: side.get(price)! }))
}
