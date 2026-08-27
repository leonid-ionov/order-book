import { memo } from 'react'
import { useMarketStore } from '../store/marketStore'
import type { PriceLevel } from '../domain/types'

const Row = memo(function Row({ level }: { level: PriceLevel }) {
  return (
    <tr>
      <td className="price">{level.price.toFixed(2)}</td>
      <td className="size">{level.size.toFixed(4)}</td>
    </tr>
  )
})

function BookSide({ side }: { side: 'bids' | 'asks' }) {
  const levels = useMarketStore((s) => (side === 'bids' ? s.bids : s.asks))
  return (
    <table className={`book-side ${side}`}>
      <thead>
        <tr>
          <th>Price</th>
          <th>Size</th>
        </tr>
      </thead>
      <tbody>
        {levels.map((level) => (
          <Row key={level.price} level={level} />
        ))}
      </tbody>
    </table>
  )
}

export function OrderBookTable() {
  return (
    <div className="order-book">
      <BookSide side="bids" />
      <BookSide side="asks" />
    </div>
  )
}
