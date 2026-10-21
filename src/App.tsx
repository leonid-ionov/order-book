import { useEffect } from 'react'
import { createBinanceSource } from './marketdata/binanceSource'
import { createDemoSource } from './marketdata/demoSource'
import { withDemoFallback } from './marketdata/withDemoFallback'
import { connectStore } from './store/marketStore'
import { TickerBar } from './components/TickerBar'
import { OrderBookTable } from './components/OrderBookTable'

export default function App() {
  useEffect(() => {
    const source = withDemoFallback(createBinanceSource(), createDemoSource())
    return connectStore(source)
  }, [])

  return (
    <div className="md:flex md:min-h-dvh md:flex-col">
      <main className="mx-auto w-full max-w-[420px] px-4 py-4 md:my-auto md:max-w-[560px] md:rounded-xl md:border md:border-border md:bg-bg md:p-6">
        <TickerBar />
        <OrderBookTable />
      </main>
    </div>
  )
}
