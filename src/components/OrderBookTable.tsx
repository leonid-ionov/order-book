import { memo } from 'react'
import { useMarketStore } from '../store/marketStore'
import { spreadOf, toDepthRows, type DepthRow } from './depth'
import { formatPrice, formatPriceGrouped, formatSize } from './format'
import { useTickDirection } from './useTickDirection'

type Side = 'bids' | 'asks'

const Row = memo(function Row({ row, side }: { row: DepthRow; side: Side }) {
  return (
    <tr className="relative leading-[17px] hover:bg-panel-hover md:leading-5">
      <td className="px-2 md:px-3 text-left">
        <span
          aria-hidden
          className={`absolute inset-y-0 right-0 ${side === 'bids' ? 'bg-bid/15' : 'bg-ask/15'}`}
          style={{ width: `${row.depth * 100}%` }}
        />
        <span className={`relative ${side === 'bids' ? 'text-bid' : 'text-ask'}`}>{formatPrice(row.price)}</span>
      </td>
      <td className="relative px-2 md:px-3 text-right">{formatSize(row.size)}</td>
      <td className="relative px-2 md:px-3 text-right text-muted">{formatSize(row.total)}</td>
    </tr>
  )
})

function Levels({ side }: { side: Side }) {
  const levels = useMarketStore((s) => (side === 'bids' ? s.bids : s.asks))
  const rows = toDepthRows(levels)
  // The best ask goes last, next to the spread row.
  if (side === 'asks') rows.reverse()
  return (
    <tbody>
      {rows.map((row) => (
        <Row key={row.price} row={row} side={side} />
      ))}
    </tbody>
  )
}

function SpreadRow() {
  const lastPrice = useMarketStore((s) => s.ticker?.lastPrice)
  const spread = useMarketStore((s) => spreadOf(s.bids, s.asks))
  const direction = useTickDirection(lastPrice)
  const tone = direction === 'up' ? 'text-bid' : direction === 'down' ? 'text-ask' : 'text-text'
  return (
    <tbody>
      <tr>
        <td colSpan={3} className="border-y border-border bg-bg px-2 py-1.5">
          <div className="flex items-baseline justify-between">
            <span className={`text-sm font-semibold md:text-base ${tone}`}>
              {lastPrice === undefined ? '—' : formatPriceGrouped(lastPrice)}
              {direction && <span aria-hidden> {direction === 'up' ? '↑' : '↓'}</span>}
            </span>
            <span className="text-muted">spread {spread === null ? '—' : formatPrice(spread)}</span>
          </div>
        </td>
      </tr>
    </tbody>
  )
}

export function OrderBookTable() {
  const waiting = useMarketStore((s) => s.status === 'loading' && s.bids.length === 0 && s.asks.length === 0)
  return (
    <div className="overflow-hidden rounded-md border border-border bg-panel">
      <table className="w-full border-collapse font-mono text-xs tabular-nums md:text-[13px]">
        <thead>
          <tr className="border-b border-border text-[10px] uppercase tracking-[0.06em] text-muted md:text-[11px]">
            <th className="px-2 md:px-3 py-1.5 text-left font-normal">Price</th>
            <th className="px-2 md:px-3 py-1.5 text-right font-normal">Size</th>
            <th className="px-2 md:px-3 py-1.5 text-right font-normal">Total</th>
          </tr>
        </thead>
        {/* Always mounted so its tick direction stays in sync with the header. */}
        {waiting ? (
          <tbody>
            <tr>
              <td colSpan={3} className="px-2 md:px-3 py-10 text-center font-sans text-muted">
                Waiting for order book…
              </td>
            </tr>
          </tbody>
        ) : (
          <Levels side="asks" />
        )}
        <SpreadRow />
        {!waiting && <Levels side="bids" />}
      </table>
    </div>
  )
}
