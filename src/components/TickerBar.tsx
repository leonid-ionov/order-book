import { useMarketStore } from '../store/marketStore'
import { formatPriceGrouped, formatVolume } from './format'
import { StatusBadge } from './StatusBadge'
import { useTickDirection } from './useTickDirection'

function Stat({ label, children, className = '' }: { label: string; children: string; className?: string }) {
  return (
    <span className="flex flex-col gap-px">
      <small className="text-[10px] text-muted md:text-[11px]">{label}</small>
      <span className={`font-mono text-xs tabular-nums md:text-sm ${className}`}>{children}</span>
    </span>
  )
}

export function TickerBar() {
  const ticker = useMarketStore((s) => s.ticker)
  const status = useMarketStore((s) => s.status)
  const direction = useTickDirection(ticker?.lastPrice)
  const tone = direction === 'up' ? 'text-bid' : direction === 'down' ? 'text-ask' : 'text-text'
  return (
    <header className="mb-3 flex flex-wrap items-center gap-x-3.5 gap-y-2 border-b border-border pb-3 md:mb-4 md:gap-x-5 md:pb-4">
      <h1 className="text-[15px] font-semibold md:text-lg">BTC/USDT</h1>
      {ticker && (
        <>
          <span className={`font-mono text-lg font-semibold tabular-nums md:text-2xl ${tone}`}>
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
