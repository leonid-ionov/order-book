import type { MarketDataSource } from '../domain/types'

/** Uses the primary source until it reports a fatal error, then switches to demo. */
export function withDemoFallback(
  primary: MarketDataSource,
  demo: MarketDataSource,
): MarketDataSource {
  return {
    subscribe(observer) {
      let unsub: () => void = () => {}
      let stopped = false
      unsub = primary.subscribe({
        next: (u) => observer.next(u),
        error: () => {
          if (stopped) return
          unsub()
          unsub = demo.subscribe({ next: (u) => observer.next(u) })
        },
      })
      return () => {
        stopped = true
        unsub()
      }
    },
  }
}
