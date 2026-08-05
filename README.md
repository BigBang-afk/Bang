# Bang — AI-Powered Crypto Trading Platform for MEXC

An institutional-style trading terminal that connects directly to the MEXC exchange (spot + futures), continuously scans every USDT pair, runs a transparent multi-factor technical/AI analysis engine, and surfaces high-confidence trade signals with full reasoning, risk management, and backtesting.

This README documents what is built, how it's architected, how to run it, and what remains as follow-on phases — per the delivery-in-phases requirement, each phase below is complete, tested, and runnable on its own.

## Architecture

```
frontend/   Next.js 14 (App Router) + TypeScript + Tailwind + Zustand + React Query + lightweight-charts
backend/    FastAPI + SQLAlchemy(async) + Celery + Redis + PostgreSQL
infra/      Docker Compose, Nginx, Kubernetes manifests
```

```
MEXC REST/WS ──> backend/app/mexc (client + streamer)
                     │
                     ▼
          backend/app/indicators (trend, momentum, volatility, volume, structure, patterns, pivots)
                     │
                     ▼
          backend/app/signals (confidence engine + signal generator)
                     │
          ┌──────────┼───────────────┐
          ▼          ▼               ▼
     Celery beat  FastAPI REST   Redis pub/sub ──> WebSocket ──> Next.js dashboard
     (scanner)     (/api/v1/*)
```

## What's implemented (Phase 1 — foundation & core trading intelligence)

**MEXC integration** (`backend/app/mexc/client.py`, `websocket.py`)
- Spot: exchange info, 24hr ticker (single pair or all), klines, order book depth, recent trades.
- Futures: ticker (incl. funding rate / open interest via `holdVol`), klines, depth, recent deals, funding rate + history, mark ("fair") price, index price.
- A reconnecting WebSocket streamer for spot deals/book-ticker and futures ticker/deal/funding-rate, republished onto Redis pub/sub so any number of API workers can fan the same upstream connections out to many browser clients.
- All market data endpoints work with **zero API keys** (MEXC's public market data). A user's own API key/secret can be attached (encrypted at rest with Fernet) in Settings for future private-endpoint (account/orders) support.

**AI analysis engine** (`backend/app/indicators/`)
- Trend: EMA 9/20/50/100/200 stack, ADX, Supertrend, Ichimoku.
- Momentum: RSI, MACD, Stochastic.
- Volatility: ATR, Bollinger Bands, Keltner Channels, Donchian Channels, volatility-regime + squeeze detection.
- Volume/order flow: VWAP, anchored VWAP, CVD approximation, volume profile (POC + value area), order-book imbalance.
- Market structure (SMC-style): swing highs/lows, support/resistance clustering, equal highs/lows, BOS/CHoCH detection, fair value gaps, simplified order blocks, premium/discount zones.
- Classic pivot points, candlestick pattern recognition (engulfing, hammer/shooting star, doji, morning/evening star, three soldiers/crows).
- `engine.py` orchestrates all of the above into one structured `analyze(df)` result reused by charts, signals, scanner, and the backtester — so backtests are representative of the live engine.

**Signal + confidence engine** (`backend/app/signals/`)
- `confidence.py`: a fully transparent, additive weighted scorer (trend alignment, multi-timeframe agreement, market structure, momentum, volume confirmation, order flow, volatility, pattern quality, liquidity) — every point is traceable to a specific, human-readable reason. Never claims certainty.
- `generator.py`: only emits a signal when several independent conditions agree AND risk:reward clears a floor. Produces entry zone, stop loss, TP1/2/3, RR, expected holding time, suggested leverage range, suggested risk %, and the full reasons list.

**Scanner** (`backend/app/scanner/`)
- `scan_all_tickers()`: ranks every USDT spot pair every 5s (configurable) by a composite of 24h change, range expansion, and quote volume.
- `deep_scan_top_movers()`: runs the full indicator + signal engine against the top-N movers every ~20s to populate the "Top High Volatility Opportunities" panel and the live signals feed.
- Celery beat schedules both jobs; results are cached in Redis and pushed to connected clients over WebSocket.

**Backtesting** (`backend/app/backtest/`)
- Walk-forward replay using the *same* `analyze()` + `generate_signal()` used live (not a separate/simplified model), bar by bar, with SL/TP1/time-based exits.
- Metrics: win rate, profit factor, expectancy, max drawdown, Sharpe ratio, average win/loss, trade count, monthly returns, full equity curve.

**Risk management** (`backend/app/risk/position_sizing.py`)
- Position sizing from account balance + risk % + stop distance + leverage → dollar risk, size, notional, margin, RR, expected value.
- Daily/weekly loss limits and max-consecutive-losses circuit breaker (`evaluate_risk_limits`).

**Platform**
- JWT auth (access + refresh), bcrypt password hashing, role-based access (`admin`/`trader`/`viewer`), per-user encrypted MEXC key storage, Redis-backed IP rate limiting, structured request logging, audit log table.
- Trade journal (CRUD, auto PnL calc on close), watchlists with pinning, alert rules (website/email/Telegram/Discord/push/sound — email+Telegram+Discord senders implemented), performance dashboard (daily/weekly/monthly PnL, win rate, avg RR, best/worst pair & session), admin panel (users, roles, system health, signal review).
- AI Assistant endpoint: calls Claude when `ANTHROPIC_API_KEY` is set, with a grounded rule-based fallback (explains *why* a signal fired, risk, confidence composition, structure, market summary) when it isn't — so the assistant always answers from the actual signal/analysis JSON, never from vibes.
- 18 passing pytest unit tests covering indicators, the signal/confidence engine, risk calculators, and the backtester.

**Frontend** (`frontend/src/`)
- Dark institutional-theme dashboard, full top navigation (Dashboard/Markets/Scanner/Signals/Portfolio/AI Assistant/Backtesting/Journal/Performance/Settings).
- `TradingChart`: lightweight-charts candles + volume, EMA/VWAP/Bollinger overlays, all 9 timeframes, fullscreen, and basic drawing tools (horizontal line, trend line). `MultiChartLayout` for a 2x2 multi-symbol grid.
- Live scanner table + "Top High Volatility Opportunities" panel + signal cards (confidence gauge, entry/SL/TP, full "why" reasoning) — all fed by React Query polling *and* a reconnecting WebSocket subscribed to the backend's Redis pub/sub channels for push updates.
- Functional Backtesting (form → equity curve via Recharts + metrics), Journal (CRUD), Performance, Portfolio, AI Assistant chat, Settings (encrypted API key form, alert test), and JWT login/register.
- TypeScript throughout, builds clean (`npm run build` succeeds, 0 type errors).

## Explicitly out of scope for this delivery (Phase 2+ extensions)

These are structurally straightforward to add on top of what's here, but weren't built out to full depth in this pass:

- **ML models (PyTorch/XGBoost/LightGBM)**: the signal/confidence engine here is a transparent, auditable rule-based system by design (the spec asks to always show *why* a signal fired — a black-box model works against that). Training real gradient-boosted/deep models needs a labeled historical dataset and GPU/training infra neither available nor safely fabricable here; `app/signals/` is structured so a trained model's probability output can be dropped in as one more weighted factor in `confidence.py` without changing the rest of the pipeline.
- **Live private trading** (placing/managing real orders on a user's MEXC account, footprint/iceberg/spoofing heuristics that need raw tick-level data MEXC doesn't expose over REST): the encrypted API-key storage and client are already there; wiring signed private endpoints is additive.
- **Full TradingView-parity drawing toolset** (Fibonacci, rectangles, brush, text annotations) and true multi-chart layouts beyond a 2x2 grid: lightweight-charts doesn't ship these; a plugin/canvas-overlay layer is the next step.
- **2FA (TOTP) verification flow, news aggregation/sentiment**: DB fields and admin scaffolding exist (`is_2fa_enabled`, `totp_secret`); the enrollment/verify endpoints and a news source integration are not yet wired up.
- **Alembic migration was hand-written** (no live Postgres in this build environment to run `--autogenerate`) — it mirrors the models exactly, but run `alembic check` against a real DB before your first production deploy.

## Running locally

### Docker Compose (recommended)
```bash
cp backend/.env.example backend/.env   # fill in SECRET_KEY / ENCRYPTION_KEY at minimum
docker compose up --build
```
- Frontend: http://localhost:3000 (or http://localhost via the bundled Nginx)
- Backend docs: http://localhost:8000/docs

### Manual
```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload

# In separate terminals:
celery -A app.celery_app worker --loglevel=info
celery -A app.celery_app beat --loglevel=info

# Frontend
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

### Tests
```bash
cd backend && pytest -q     # 18 passed
cd frontend && npm run build && npx tsc --noEmit
```

## Security notes
- MEXC API secrets are Fernet-encrypted at rest, never returned by any endpoint.
- All mutating endpoints require a valid JWT; admin endpoints additionally require the `admin` role.
- A Redis-backed rate limiter caps requests per IP per minute on all `/api/*` routes.
- Before production: rotate `SECRET_KEY`/`ENCRYPTION_KEY`, put real TLS in front of Nginx/Ingress, and review `npm audit` (the Next.js 14 toolchain currently reports transitive `postcss` advisories fixed only in Next 15/16 — a major-version bump is recommended before going live).
