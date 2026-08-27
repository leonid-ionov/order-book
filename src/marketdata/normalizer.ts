import type { BookSnapshot, DepthDelta, PriceLevel, Ticker } from '../domain/types'

export interface RawDepthEvent {
  e: 'depthUpdate'
  U: number
  u: number
  b: [string, string][]
  a: [string, string][]
}

export interface RawTickerEvent {
  e: '24hrTicker'
  c: string // last price
  P: string // price change percent
  v: string // volume
}

export interface RawSnapshot {
  lastUpdateId: number
  bids: [string, string][]
  asks: [string, string][]
}

export type StreamMessage =
  | { kind: 'depth'; delta: DepthDelta }
  | { kind: 'ticker'; ticker: Ticker }

const toLevels = (raw: [string, string][]): PriceLevel[] =>
  raw.map(([price, size]) => ({ price: Number(price), size: Number(size) }))

export function normalizeDepth(raw: RawDepthEvent): DepthDelta {
  return {
    firstUpdateId: raw.U,
    lastUpdateId: raw.u,
    bids: toLevels(raw.b),
    asks: toLevels(raw.a),
  }
}

export function normalizeTicker(raw: RawTickerEvent): Ticker {
  return {
    lastPrice: Number(raw.c),
    changePercent24h: Number(raw.P),
    volume24h: Number(raw.v),
  }
}

export function normalizeSnapshot(raw: RawSnapshot): BookSnapshot {
  return {
    lastUpdateId: raw.lastUpdateId,
    bids: toLevels(raw.bids),
    asks: toLevels(raw.asks),
  }
}

function isRawDepthEvent(data: object): data is RawDepthEvent {
  const candidate = data as Record<string, unknown>
  return Array.isArray(candidate.b) && Array.isArray(candidate.a)
}

function isRawTickerEvent(data: object): data is RawTickerEvent {
  const candidate = data as Record<string, unknown>
  return (
    typeof candidate.c === 'string' &&
    typeof candidate.P === 'string' &&
    typeof candidate.v === 'string'
  )
}

export function parseStreamMessage(json: string): StreamMessage | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const data = (parsed as { data?: { e?: string } }).data
  if (!data || typeof data.e !== 'string') return null
  if (data.e === 'depthUpdate') {
    if (!isRawDepthEvent(data)) return null
    return { kind: 'depth', delta: normalizeDepth(data) }
  }
  if (data.e === '24hrTicker') {
    if (!isRawTickerEvent(data)) return null
    return { kind: 'ticker', ticker: normalizeTicker(data) }
  }
  return null
}
