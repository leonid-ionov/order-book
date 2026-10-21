import { useMarketStore } from '../store/marketStore'
import { formatPriceGrouped, formatVolume } from './format'
import { StatusBadge } from './StatusBadge'
import { useTickDirection } from './useTickDirection'

function Stat({ label, children, className = '' }: { label: string; children: string; className?: string }) {
  return (
    <span className="flex flex-col gap-px">
      <small className="text-[10px] text-muted">{label}</small>
      <span className={`font-mono text-xs tabular-nums ${className}`}>{children}</span>
    </span>
  )
}

export function TickerBar() {
  const ticker = useMarketStore((s) => s.ticker)
  const status = useMarketStore((s) => s.status)
  const direction = useTickDirection(ticker?.lastPrice)
  const tone = direction === 'up' ? 'text-bid' : direction === 'down' ? 'text-ask' : 'text-text'
  return (
    <header className="mb-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border pb-3">
      <h1 className="text-[15px] font-semibold">BTC/USDT</h1>
      {ticker && (
        <>
          <span className={`font-mono text-lg font-semibold tabular-nums ${tone}`}>
            {formatPriceGrouped(ticker.lastPrice)}
          </span>
          <Stat label="24h" className={ticker.changePercent24h >= 0 ? 'text-bid' : 'text-ask'}>
            {`${ticker.changePercent24h >= 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}%`}
          </Stat>
          <Stat label="Vol">{formatVolume(ticker.volume24h)}</Stat>
        </>
      )}
      <span className="ml-auto">
        <StatusBadge status={status} />
      </span>
    </header>
  )
}
