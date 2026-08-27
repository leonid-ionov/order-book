import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderBookTable } from './OrderBookTable'
import { useMarketStore } from '../store/marketStore'

beforeEach(() => {
  useMarketStore.setState({ bids: [], asks: [], ticker: null, status: 'loading' })
})

describe('OrderBookTable', () => {
  it('renders bid and ask rows from the store', () => {
    useMarketStore.setState({
      bids: [
        { price: 99, size: 1.5 },
        { price: 98, size: 2 },
      ],
      asks: [{ price: 101, size: 0.5 }],
    })
    render(<OrderBookTable />)
    expect(screen.getByText('99.00')).toBeInTheDocument()
    expect(screen.getByText('98.00')).toBeInTheDocument()
    expect(screen.getByText('101.00')).toBeInTheDocument()
    expect(screen.getByText('1.5000')).toBeInTheDocument()
  })
})
