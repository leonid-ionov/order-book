import { describe, it, expect } from 'vitest'
import { formatPrice, formatPriceGrouped, formatSize, formatVolume } from './format'

describe('number formats', () => {
  it('formats ladder prices without grouping', () => {
    expect(formatPrice(80288)).toBe('80288.00')
  })

  it('formats header prices with en-US grouping', () => {
    expect(formatPriceGrouped(80288)).toBe('80,288.00')
  })

  it('formats sizes with 4 decimals', () => {
    expect(formatSize(1.5)).toBe('1.5000')
  })

  it('formats volume as grouped integer', () => {
    expect(formatVolume(12345.67)).toBe('12,346')
  })
})
