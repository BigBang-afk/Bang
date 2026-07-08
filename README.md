# Quotex OTC Perfect Signal Scanner

A probability-based CALL/PUT signal dashboard for Quotex OTC pairs, with a live
signal engine, backtesting, signal history, and an admin panel.

**Important:** This tool always outputs a CALL or PUT signal with a confidence
score between 55% and 99% — it never shows "NO TRADE" and never claims 100%
confidence or guaranteed profit. Signals are technical-analysis probability
estimates, not financial advice.

**Data source disclosure:** Quotex does not publish a public market-data API.
Live prices in this project come from a deterministic, seeded synthetic OTC
candle generator (`src/lib/candles/generator.ts`) — a random walk with a slow
session-trend bias — so the indicator/signal engine always has a live-feeling
feed to analyze. The rest of the engine (indicators, scoring, signal logic)
only depends on a plain `Candle[]` array, so you can swap in a real broker
feed or websocket later without touching the scoring logic.

## Tech stack

- Next.js 16 (App Router) + React 18 + TypeScript
- Tailwind CSS
- Node.js API routes (Next.js route handlers)
- PostgreSQL + Prisma ORM
- lightweight-charts (candlestick chart), Recharts (performance chart)

## Project structure

```
prisma/schema.prisma          Signal / BacktestRun models
src/lib/candles/              Synthetic OTC candle generator (seeded RNG)
src/lib/indicators/           EMA, RSI, MACD, Bollinger, ATR, S/R, candle patterns
src/lib/engine/                Condition scoring, confidence scorer, signal engine,
                               reason-string builder, settlement logic
src/lib/backtest/             CSV parser + backtest runner
src/lib/db/prisma.ts          Prisma client singleton
src/components/               SignalCard, PairSelector, ExpirySelector,
                               CountdownTimer, ConfidenceMeter, ChartPanel,
                               SignalHistoryTable, PerformanceChart, QuotexButton
src/app/                      Dashboard, /history, /backtest, /admin pages
src/app/api/                  /api/signal, /api/history, /api/backtest, /api/admin/stats
```

## How the signal engine works

1. **Indicators**: EMA 5/20/50, RSI 14, MACD, Bollinger Bands, ATR, swing-based
   support/resistance, plus candle-pattern detectors (body strength, wick
   rejection, momentum, breakout, breakout-retest, pullback, liquidity sweep).
2. **Condition scoring** (`src/lib/engine/conditions.ts`): each indicator/pattern
   produces a directional score from -1 (bearish) to +1 (bullish).
3. **Confidence scorer** (`src/lib/engine/scorer.ts`): the 100-point system —
   Trend 20, EMA alignment 15, RSI 15, MACD 10, Candle pressure 15, Wick
   rejection 10, Support/Resistance 10, Volatility quality 5 — splits each
   category's points between CALL and PUT proportionally to its directional
   score. The two totals always sum to 100, so the winning side's score IS
   the confidence (clamped to 55–99, rounded, never 100).
4. **Expiry profiles** (`src/lib/engine/weights.ts`):
   - **15 seconds**: 5-second candles, last 10 analyzed, weight shifted toward
     candle pressure/wick rejection/S-R reaction (fast signals).
   - **1 minute**: 60-second candles, last 40 analyzed, full weight on
     trend/EMA/RSI/MACD (slower, stronger trend confirmation).
5. **Never "NO TRADE"**: direction is always `argmax(callScore, putScore)`; on
   an exact tie it falls back to candle pressure, then a stable hash — always
   emits CALL or PUT.

## Prerequisites

- Node.js 20+ (Next 16 requires ≥ 20.9)
- PostgreSQL 13+
- npm

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure your database connection
cp .env.example .env
# edit .env and set DATABASE_URL, e.g.:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/quotex_signals?schema=public"

# 3. Create the database (if it doesn't exist yet)
createdb quotex_signals   # or: psql -c "CREATE DATABASE quotex_signals;"

# 4. Run the Prisma migration to create tables
npx prisma migrate dev --name init

# 5. Start the dev server
npm run dev
```

Visit http://localhost:3000.

## Running in Visual Studio Code

1. Open the project folder in VS Code (`File > Open Folder…`).
2. Install the recommended extensions when prompted (or manually install
   "Tailwind CSS IntelliSense" and "Prisma").
3. Open a terminal in VS Code (`` Ctrl+` ``) and run the installation steps
   above.
4. Use the built-in **Run and Debug** panel, or just run `npm run dev` in the
   terminal — Next.js hot-reloads on save.
5. To inspect the database visually, run `npx prisma studio` in a second
   terminal tab.
6. `Ctrl+Click` any `file_path:line` reference in terminal output to jump
   straight to that location in the editor.

## Other useful commands

```bash
npm run build         # production build
npm run start         # run the production build
npm run type-check    # tsc --noEmit
npx prisma studio     # visual DB browser
```

## Using the app

- **Dashboard** (`/`): pick a pair and expiry, watch the live candlestick
  chart and the CALL/PUT signal card update automatically every candle.
  "Open Quotex Chart" opens https://market-qx.trade/en/ in a new tab.
- **Signal History** (`/history`): every live signal is persisted; past
  signals are auto-settled (WIN/LOSS) once their expiry time passes, replayed
  against the same deterministic candle feed.
- **Backtesting** (`/backtest`): upload a CSV with `time,open,high,low,close`
  columns (optionally a `pair` column for multi-pair files), pick a pair and
  expiry, and run the same signal engine over historical candles. Shows total
  trades, wins, losses, win rate, best/worst pair, average confidence, and
  win/loss streaks.
- **Admin** (`/admin`): aggregate stats across all signals and backtest runs,
  with buttons to clear live history or backtest runs.

## Disclaimer

All signals are probability-based technical analysis, not financial advice.
No trading result is guaranteed. Trade at your own risk.
