import { describe, it, expect } from 'vitest'
import {
  normalizeDepth,
  normalizeTicker,
  normalizeSnapshot,
  parseStreamMessage,
} from './normalizer'

const rawPair = (p: string, s: string): [string, string] => [p, s]

describe('normalizeDepth', () => {
  it('converts binance depth event to domain delta with numeric prices', () => {
    const raw = {
      e: 'depthUpdate' as const,
      U: 100,
      u: 102,
      b: [rawPair('50000.10', '1.5')],
      a: [rawPair('50001.00', '0.000')],
    }
    expect(normalizeDepth(raw)).toEqual({
      firstUpdateId: 100,
      lastUpdateId: 102,
      bids: [{ price: 50000.1, size: 1.5 }],
      asks: [{ price: 50001, size: 0 }],
    })
  })
})

describe('normalizeTicker', () => {
  it('converts binance 24hr ticker event', () => {
    const raw = { e: '24hrTicker' as const, c: '50123.45', P: '-2.15', v: '12345.6' }
    expect(normalizeTicker(raw)).toEqual({
      lastPrice: 50123.45,
      changePercent24h: -2.15,
      volume24h: 12345.6,
    })
  })
})

describe('normalizeSnapshot', () => {
  it('converts REST depth snapshot', () => {
    const raw = {
      lastUpdateId: 500,
      bids: [rawPair('50000.00', '2')],
      asks: [rawPair('50001.00', '3')],
    }
    expect(normalizeSnapshot(raw)).toEqual({
      lastUpdateId: 500,
      bids: [{ price: 50000, size: 2 }],
      asks: [{ price: 50001, size: 3 }],
    })
  })
})

describe('parseStreamMessage', () => {
  it('parses combined-stream depth message', () => {
    const json = JSON.stringify({
      stream: 'btcusdt@depth@100ms',
      data: { e: 'depthUpdate', U: 1, u: 2, b: [], a: [rawPair('1', '1')] },
    })
    expect(parseStreamMessage(json)).toEqual({
      kind: 'depth',
      delta: { firstUpdateId: 1, lastUpdateId: 2, bids: [], asks: [{ price: 1, size: 1 }] },
    })
  })

  it('parses combined-stream ticker message', () => {
    const json = JSON.stringify({
      stream: 'btcusdt@ticker',
      data: { e: '24hrTicker', c: '1', P: '2', v: '3' },
    })
    expect(parseStreamMessage(json)).toEqual({
      kind: 'ticker',
      ticker: { lastPrice: 1, changePercent24h: 2, volume24h: 3 },
    })
  })

  it('returns null for unknown or malformed messages', () => {
    expect(parseStreamMessage('not json')).toBeNull()
    expect(parseStreamMessage('{"data":{"e":"kline"}}')).toBeNull()
    expect(parseStreamMessage('{"foo":1}')).toBeNull()
  })

  it('returns null for malformed depthUpdate missing b/a arrays', () => {
    expect(parseStreamMessage('{"data":{"e":"depthUpdate","U":1,"u":2}}')).toBeNull()
  })

  it('returns null for malformed 24hrTicker missing fields', () => {
    expect(parseStreamMessage('{"data":{"e":"24hrTicker"}}')).toBeNull()
  })
})
