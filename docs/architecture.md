# Architecture

The application receives a REST snapshot and live WebSocket messages from Binance. Everything above the market data source works with normalized domain objects and does not depend on the Binance payload format.

## Data flow

1. `connection.ts` owns the WebSocket connection and reconnect schedule.
2. `normalizer.ts` validates Binance payloads and converts them to domain types.
3. `reconciler.ts` maintains bid and ask maps and applies updates in sequence.
4. `binanceSource.ts` coordinates the connection, snapshot loading, and resynchronization.
5. `marketStore.ts` batches market updates and flushes them once per animation frame.
6. React components subscribe to the store and render the ticker and top price levels.

`MarketDataSource` is the boundary between data acquisition and the rest of the application. The demo source implements the same interface, so the store and components do not need separate fallback logic.

## Snapshot and delta synchronization

The WebSocket starts before the REST request completes. Incoming depth updates are buffered until the snapshot arrives. The reconciler then loads the snapshot and replays the buffered updates in arrival order.

Each depth update produces one of three results:

- `applied`: the update continues the current sequence and changes the book.
- `stale`: its final update ID has already been applied, so it is ignored.
- `gap`: its first update ID skips the expected sequence. The current book is cleared and a new snapshot is requested.

Bid and ask levels are stored in separate maps keyed by price. A size of zero removes a level. Sorting happens when the UI requests the best 30 prices on either side.

## Connection and fallback

The connection retries with exponential backoff. A reconnect clears the current book and starts synchronization again. Snapshot requests are retried while the current connection epoch remains active, which prevents an older request from overwriting newer state.

After the configured number of failed WebSocket reconnection attempts, the source reports an error. `withDemoFallback` then unsubscribes from Binance and starts the synthetic data source.

## Rendering

Market messages can arrive more often than the browser should render. The store accumulates pending book, ticker, and status updates, then applies them in one Zustand update scheduled with `requestAnimationFrame`. Tests inject a scheduler so batching can be checked without relying on browser timing.
