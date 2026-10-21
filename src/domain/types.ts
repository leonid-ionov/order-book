export interface PriceLevel {
  price: number
  size: number
}

export interface DepthDelta {
  firstUpdateId: number // Binance U
  lastUpdateId: number // Binance u
  bids: PriceLevel[]
  asks: PriceLevel[]
}

export interface BookSnapshot {
  lastUpdateId: number
  bids: PriceLevel[]
  asks: PriceLevel[]
}

export interface Ticker {
  lastPrice: number
  changePercent24h: number
  volume24h: number
}

export type FeedStatus = 'loading' | 'live' | 'demo'

export type MarketUpdate =
  | { type: 'book'; bids: PriceLevel[]; asks: PriceLevel[] }
  | { type: 'ticker'; ticker: Ticker }
  | { type: 'status'; status: FeedStatus }

export interface MarketObserver {
  next(update: MarketUpdate): void
  error?(err: unknown): void
}

/** The only data contract the store and UI depend on. */
export interface MarketDataSource {
  subscribe(observer: MarketObserver): () => void
}
