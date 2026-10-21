import type { MarketDataSource, PriceLevel } from '../domain/types'

const BASE_PRICE = 100_000
const LEVELS = 30

/** Fake MarketDataSource used when Binance is unavailable. Prices follow a deterministic sine wave. */
export function createDemoSource(intervalMs = 250): MarketDataSource {
  return {
    subscribe(observer) {
      let tick = 0
      observer.next({ type: 'status', status: 'demo' })

      const level = (mid: number, side: 1 | -1, i: number): PriceLevel => ({
        price: Math.round((mid + side * (i + 1) * 10) * 100) / 100,
        size: Math.round((0.5 + Math.abs(Math.sin(tick + i))) * 1000) / 1000,
      })

      const timer = setInterval(() => {
        tick++
        const mid = BASE_PRICE + Math.sin(tick / 20) * 150
        observer.next({
          type: 'book',
          bids: Array.from({ length: LEVELS }, (_, i) => level(mid, -1, i)),
          asks: Array.from({ length: LEVELS }, (_, i) => level(mid, 1, i)),
        })
        if (tick % 8 === 1) {
          observer.next({
            type: 'ticker',
            ticker: { lastPrice: mid, changePercent24h: 1.23, volume24h: 12345 },
          })
        }
      }, intervalMs)

      return () => clearInterval(timer)
    },
  }
}
