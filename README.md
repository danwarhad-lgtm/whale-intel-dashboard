# Whale Intel · Polyglot Crypto Terminal

> Educational research dashboard for crypto whale activity, exchange flows, stablecoin peg health, and market structure.

## Pengantar (Bahasa Indonesia)

Whale Intel adalah dashboard riset *open-source* untuk memantau aktivitas paus (whale), arus dana di bursa terpusat, kesehatan peg stablecoin, dan kondisi pasar kripto secara umum. Aplikasi ini dirancang sebagai *terminal poliglot*: bagian utama ditulis dengan **Next.js 15 (JavaScript)**, sementara komponen pendukung memakai **Python** untuk skoring, **Go** untuk health probe, **SQL** untuk skema persistensi, dan **Bash** untuk skrip otomasi. Semua data diambil dari API publik gratis seperti CoinGecko, DefiLlama, dan Binance — tanpa API key berbayar.

Proyek ini bersifat *demo riset*. Beberapa angka (transaksi paus, exchange flow detail) di-*simulasikan* karena dataset sebenarnya berada di balik layanan berbayar (Whale Alert, Glassnode, Nansen, dll). Tujuan utamanya adalah menunjukkan bagaimana lima bahasa pemrograman dapat bekerja sama dalam satu platform terminal kripto, lengkap dengan UI gelap, mode *fallback* otomatis, dan persistensi lokal untuk *watchlist*, *alerts*, serta *reports*. **Bukan nasihat finansial.**

## Features

- **Overview** with composite risk score, top markets ticker, sub-score breakdown, and live API health card.
- **Whale Tracker** with chain / severity / type filters, search, and minimum USD threshold.
- **Exchange Flows** trend chart, leaderboard, and per-token breakdown.
- **Stablecoin Monitor** with peg deviation table, dominance pie, and health score.
- **Market** explorer for the top 100 tokens with sparkline, sort, search, and detail dialog.
- **Alerts** feed with severity filter, generate-test, mark-read and persistent storage.
- **Watchlist** with price targets, distance-to-target, and best/worst summary stats.
- **Reports** generator with Preview / JSON / Markdown tabs, copy and download.
- **Settings** for theme, refresh cadence, data mode, API status probe, and local data tools.

## Tech stack (5 languages)

| Language | Where it lives | What it does |
| --- | --- | --- |
| JavaScript | `src/**` (Next.js 15 App Router) | UI, hooks, all `/api/*` route handlers |
| Python | `api/score.py` | Composite scoring serverless function |
| Go | `api/health.go` | Concurrent multi-provider health probe |
| SQL | `sql/schema-postgres.sql` | Postgres schema for alerts / watchlist / reports |
| Bash | `scripts/{dev,deploy,test-apis}.sh` | Dev runner, deploy helper, API smoke tests |

UI: Tailwind CSS 3 + Radix primitives + lucide-react + Recharts + sonner toasts.
Data: TanStack Query for fetching, localStorage for client persistence.

## Free APIs

- **CoinGecko** — `/coins/markets`, `/global`, `/simple/price` for prices, market caps, sparklines, dominance.
- **DefiLlama** — `/stablecoins` for stablecoin circulating supply.
- **Binance** — `/ticker/24hr` as fallback when CoinGecko is rate-limited.

Whale transactions and exchange flows are simulated in `src/lib/mocks.js` because the underlying datasets sit behind paid services. Every API route returns an envelope:

```json
{ "data": ..., "status": "live|cached|fallback|simulated|error", "provider": "...", "lastUpdated": "ISO-8601" }
```

The `DataSourceBadge` in the top-right of every page surfaces this status to the user.

## Architecture

```
                          ┌──────────────────────────────┐
                          │   Browser (Next.js client)    │
                          │  React + TanStack Query +     │
                          │  Tailwind + Recharts          │
                          └───────────────┬──────────────┘
                                          │  fetch
                                          ▼
        ┌─────────────────────────────────────────────────────────┐
        │                  Next.js route handlers                  │
        │   /api/market   /api/whale-transactions                  │
        │   /api/exchange-flows  /api/stablecoins                  │
        │   /api/refresh  /api/health-proxy                        │
        │   (in-memory cache + envelope shape)                     │
        └────────────┬───────────────────────────┬────────────────┘
                     │                           │
            ┌────────▼─────────┐         ┌──────▼─────────┐
            │  CoinGecko       │         │  Python /api/   │
            │  DefiLlama       │         │  score.py       │
            │  Binance (free)  │         │  (Vercel)       │
            └────────┬─────────┘         └────────────────┘
                     │
            ┌────────▼─────────┐
            │  Go /api/health  │
            │  concurrent      │
            │  provider pings  │
            └──────────────────┘

  localStorage:  alerts · watchlist · reports · settings
  Postgres:      sql/schema-postgres.sql (optional, for self-host)
  Bash:          scripts/dev.sh, deploy.sh, test-apis.sh
```

## Quick start

```bash
git clone <this-repo>
cd whale-intel-poly
bash scripts/dev.sh        # installs + starts dev server
# or, manually:
npm install
npm run dev
```

Open http://localhost:3000.

Smoke-test the free APIs:

```bash
bash scripts/test-apis.sh
```

## Deploy

The project is designed for **Vercel**:

```bash
bash scripts/deploy.sh        # runs `vercel --prod`
```

`vercel.json` wires the polyglot serverless functions:

- `api/score.py` → Python runtime
- `api/health.go` → Go runtime
- everything under `src/app/api/**` → Node runtime

For self-hosting, run `npm run build && npm start` behind any Node-capable proxy.

## Limitations

- Whale transactions and exchange-flow rows are **simulated** for demonstration — they look realistic but are not on-chain truth.
- CoinGecko's free tier is rate-limited; expect occasional `fallback` status during heavy refreshes.
- The Go and Python serverless functions only run when deployed to Vercel. In local dev, `/api/health-proxy` falls back to a JavaScript probe.
- Alerts, watchlist, reports, and settings live in **localStorage**, so they don't sync across browsers.

## Disclaimer

This dashboard is for **educational and research purposes only**. Nothing here is financial advice. Crypto markets are volatile and the data displayed may be incomplete, delayed, or simulated. Always do your own research before making any financial decision.
