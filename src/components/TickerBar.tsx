import { useMarketStore } from '../store/marketStore'

export function TickerBar() {
  const ticker = useMarketStore((s) => s.ticker)
  const status = useMarketStore((s) => s.status)
  return (
    <header className="ticker-bar">
      <h1>BTC/USDT</h1>
      {ticker && (
        <>
          <span className="price">{ticker.lastPrice.toFixed(2)}</span>
          <span className={ticker.changePercent24h >= 0 ? 'change up' : 'change down'}>
            {ticker.changePercent24h.toFixed(2)}%
          </span>
          <span className="volume">Vol {ticker.volume24h.toFixed(0)}</span>
        </>
      )}
      {status === 'loading' && <span className="badge badge-loading">loading…</span>}
      {status === 'demo' && <span className="badge badge-demo">demo data</span>}
    </header>
  )
}
