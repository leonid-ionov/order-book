import { describe, it, expect, beforeEach } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { OrderBookTable } from './OrderBookTable'
import { useMarketStore } from '../store/marketStore'

beforeEach(() => {
  useMarketStore.setState({ bids: [], asks: [], ticker: null, status: 'live' })
})

const rowOf = (text: string) => screen.getByText(text).closest('tr') as HTMLElement

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
    expect(screen.getAllByText('1.5000').length).toBeGreaterThan(0)
  })

  it('shows the cumulative total per level', () => {
    useMarketStore.setState({
      bids: [
        { price: 99, size: 1.5 },
        { price: 98, size: 2 },
      ],
    })
    render(<OrderBookTable />)
    expect(within(rowOf('98.00')).getByText('3.5000')).toBeInTheDocument()
  })

  it('puts the best ask last, next to the spread', () => {
    useMarketStore.setState({
      asks: [
        { price: 101, size: 1 },
        { price: 102, size: 1 },
      ],
    })
    render(<OrderBookTable />)
    const worse = screen.getByText('102.00')
    const best = screen.getByText('101.00')
    expect(worse.compareDocumentPosition(best) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows the spread between best bid and best ask', () => {
    useMarketStore.setState({ bids: [{ price: 99, size: 1 }], asks: [{ price: 101, size: 1 }] })
    render(<OrderBookTable />)
    expect(screen.getByText('spread 2.00')).toBeInTheDocument()
  })

  it('shows a dash when a side is empty', () => {
    useMarketStore.setState({ bids: [{ price: 99, size: 1 }] })
    render(<OrderBookTable />)
    expect(screen.getByText('spread —')).toBeInTheDocument()
  })

  it('renders at most 15 levels per side', () => {
    useMarketStore.setState({
      bids: Array.from({ length: 20 }, (_, i) => ({ price: 99 - i, size: 1 })),
    })
    render(<OrderBookTable />)
    expect(screen.getByText('85.00')).toBeInTheDocument()
    expect(screen.queryByText('84.00')).not.toBeInTheDocument()
  })

  it('is an accessible table with column headers', () => {
    render(<OrderBookTable />)
    expect(screen.getByRole('table')).toBeInTheDocument()
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Price', 'Size', 'Total'])
  })

  it('shows a placeholder while the book is loading', () => {
    useMarketStore.setState({ status: 'loading' })
    render(<OrderBookTable />)
    expect(screen.getByText('Waiting for order book…')).toBeInTheDocument()
  })

  it('keeps the tick direction from ticks that arrived while loading', () => {
    useMarketStore.setState({ status: 'loading' })
    render(<OrderBookTable />)
    const ticker = { changePercent24h: 0, volume24h: 0 }
    act(() => useMarketStore.setState({ ticker: { ...ticker, lastPrice: 100 } }))
    act(() => useMarketStore.setState({ ticker: { ...ticker, lastPrice: 101 } }))
    act(() =>
      useMarketStore.setState({ status: 'live', bids: [{ price: 100, size: 1 }], asks: [{ price: 102, size: 1 }] }),
    )
    expect(screen.getByText('↑')).toBeInTheDocument()
  })
})
