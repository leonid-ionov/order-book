# Order Book

A browser-based BTC/USDT order book built with React and TypeScript. It combines a Binance REST snapshot with updates from the `@depth@100ms` WebSocket stream and keeps both sides of the book synchronized by update ID.

[Live demo](https://order-book-one-peach.vercel.app/)

## What it handles

- Deltas received before the REST snapshot are buffered and replayed after it arrives.
- Stale updates are ignored. A gap in update IDs starts a fresh synchronization cycle.
- The WebSocket reconnects with exponential backoff.
- After repeated connection or snapshot failures, the app switches to a synthetic feed and marks it as demo data.
- Market updates are applied to the Zustand store once per animation frame.
- The UI shows the best 15 bid and ask levels as a depth ladder: asks above the spread, bids below, each row with a cumulative volume bar.

The market data code is separated from the store and React components by the `MarketDataSource` interface. The reconciler contains no network or timer code, which keeps its behavior deterministic in tests. See [the architecture notes](docs/architecture.md) for the module boundaries and synchronization flow.

## Run locally

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5173`.

## Tests and production build

```bash
npm test
npm run build
```

The test suite contains 68 tests across 12 files. It covers payload validation, snapshot and delta reconciliation, reconnection, source orchestration, fallback behavior, store batching, depth totals and spread, and the main UI components.

## Stack

React 18, TypeScript in strict mode, Vite, Tailwind CSS v4, Zustand, Vitest, and Testing Library. The project does not use a chart library or component framework. Colors and fonts are defined as theme tokens in `src/index.css`.

## Current scope

The app supports BTC/USDT from Binance and displays the order book and 24-hour ticker data. Trades, candlesticks, pair selection, price grouping, and multi-exchange aggregation are possible follow-up features.
