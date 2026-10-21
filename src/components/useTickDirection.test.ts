import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTickDirection } from './useTickDirection'

function track(prices: Array<number | undefined>) {
  const { result, rerender } = renderHook(({ price }) => useTickDirection(price), {
    initialProps: { price: prices[0] },
  })
  for (const price of prices.slice(1)) rerender({ price })
  return result.current
}

describe('useTickDirection', () => {
  it('has no direction for the first price', () => {
    expect(track([100])).toBeNull()
  })

  it('is up when the price rises', () => {
    expect(track([100, 101])).toBe('up')
  })

  it('is down when the price falls', () => {
    expect(track([101, 100])).toBe('down')
  })

  it('keeps the previous direction when the price is unchanged', () => {
    expect(track([100, 101, 101])).toBe('up')
  })

  it('has no direction without a price', () => {
    expect(track([undefined])).toBeNull()
  })
})
