import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TickerBar } from './TickerBar'
import { useMarketStore } from '../store/marketStore'

beforeEach(() => {
  useMarketStore.setState({ bids: [], asks: [], ticker: null, status: 'loading' })
})

describe('TickerBar', () => {
  it('shows loading badge and pair name before data arrives', () => {
    render(<TickerBar />)
    expect(screen.getByText('BTC/USDT')).toBeInTheDocument()
    expect(screen.getByText('loading…')).toBeInTheDocument()
  })

  it('renders price, change and volume when live', () => {
    useMarketStore.setState({
      status: 'live',
      ticker: { lastPrice: 50123.456, changePercent24h: -2.15, volume24h: 12345.67 },
    })
    render(<TickerBar />)
    expect(screen.getByText('50123.46')).toBeInTheDocument()
    expect(screen.getByText('-2.15%')).toBeInTheDocument()
    expect(screen.getByText(/12346/)).toBeInTheDocument()
    expect(screen.queryByText('loading…')).not.toBeInTheDocument()
  })

  it('shows demo badge in demo mode', () => {
    useMarketStore.setState({ status: 'demo' })
    render(<TickerBar />)
    expect(screen.getByText('demo data')).toBeInTheDocument()
  })
})
