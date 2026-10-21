import { useRef } from 'react'

export type TickDirection = 'up' | 'down' | null

/** Direction of the last price change. An unchanged price keeps the previous direction. */
export function useTickDirection(price: number | undefined): TickDirection {
  const prev = useRef<number | undefined>(undefined)
  const direction = useRef<TickDirection>(null)
  if (price !== prev.current) {
    if (price !== undefined && prev.current !== undefined) {
      direction.current = price > prev.current ? 'up' : 'down'
    }
    prev.current = price
  }
  return price === undefined ? null : direction.current
}
