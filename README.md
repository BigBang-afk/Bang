# Aurum — AI Crypto Signal Platform (MEXC)

Institutional-grade AI crypto trading platform connected to MEXC. Combines market structure,
Smart Money Concepts, order flow, volume, momentum, volatility and multi-timeframe confirmation
into a single weighted **AI confidence score (0–100%)** per signal — never a guaranteed outcome,
always an explainable one.

This is a large, multi-phase build. This repository currently ships **Phase 1**: a working,
tested foundation covering auth, MEXC integration, risk management, the analysis/signal engine,
and the core UI. See [Roadmap](#roadmap) below for what's next.

## Stack

- **Frontend**: Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS
- **Backend**: FastAPI (Python 3.12, async)
- **Database**: PostgreSQL (SQLAlchemy 2.0 async + Alembic migrations)
- **Cache / background state**: Redis
- **Real-time**: native WebSockets (price + signal channels)
- **Charts**: TradingView Advanced Chart widget embed
- **Deployment**: Docker Compose + Nginx reverse proxy

## Repository layout

```
backend/            FastAPI app
  app/
    core/            config, JWT/2FA/encryption (security.py)
    db/models/       SQLAlchemy models (user, api_key, trade, signal, subscription, audit_log)
    services/        MEXC client, indicators, market structure/SMC, order flow, risk manager,
                      signal engine, scanner, notifications
    api/v1/          REST routers (auth, mexc, signals, risk, journal, analytics, admin, settings)
    websockets/      connection manager + price/signal broadcast tasks
    tests/           pytest unit tests for indicators, market structure, risk manager
  alembic/           DB migrations
frontend/            Next.js app
  app/               route pages (login, dashboard, scanner, signals, journal, analytics, admin, settings)
  components/        UI primitives, layout shell, onboarding modals, chart embed, signal cards
  lib/                API client, auth helpers, Zustand session store, shared types
docker/nginx.conf     reverse proxy config
docker-compose.yml    postgres + redis + backend + frontend + nginx
```

## Running locally

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY, API_KEY_ENCRYPTION_KEY (Fernet.generate_key()), DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload
```

Run tests: `pytest app/tests/ -v`

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

### Full stack via Docker

```bash
docker compose up --build
```

Nginx serves the app on `http://localhost` and proxies `/api/*` and `/ws/*` to the backend.

## Security notes

- MEXC API keys are encrypted at rest with Fernet (`API_KEY_ENCRYPTION_KEY`) and only decrypted
  in-memory per-request to build a signed MEXC client.
- JWT access/refresh tokens, bcrypt password hashing, optional TOTP 2FA (`/auth/2fa/*`).
- Per-IP rate limiting (slowapi) and security headers on every response.
- Every login, registration, and admin action is written to `audit_logs`.
- The platform **never places a trade or resizes a position beyond the user's configured risk
  limits** — `risk_manager.py` enforces daily/weekly loss, max drawdown, and max simultaneous
  trade limits before any order path is allowed to proceed.

## Design system

Black / dark-gray / gold institutional theme (`tailwind.config.ts`): `void`, `obsidian`,
`charcoal`, `graphite` neutrals with a `gold` accent, plus semantic `bull`/`bear` colors for
PnL and long/short badges.

## Roadmap

**Phase 1 (this repo) — done:**
- Auth (JWT + 2FA), encrypted MEXC API key storage, audit logging
- MEXC REST integration: account, positions, orders (place/cancel), klines, depth, trades, funding rate
- Risk manager: position sizing, daily/weekly loss, drawdown, max concurrent trade enforcement
- Analysis engine: EMA/RSI/MACD/StochRSI/ADX/ATR/VWAP, market structure (swings/BOS/CHOCH),
  SMC (order blocks, FVGs, liquidity pools, premium/discount), order flow (imbalance, absorption,
  exhaustion, wall/spoofing heuristics), candlestick patterns
- Weighted AI confidence score (0–100) with a reason string per factor, multi-timeframe confirmation
- Background scanner + WebSocket broadcast of live prices/signals
- Core UI: login/register, onboarding (trading mode + risk setup), dashboard, scanner, signals,
  journal, analytics, settings (API keys), admin (users/signals/audit log), TradingView chart embed
- Unit tests for indicators, market structure, and risk manager; typechecked & production-built frontend

**Phase 2 — planned:**
- Full MEXC WebSocket streaming (replace REST polling) for prices, order book, and trade prints
- Persist scanner output continuously and auto-expire/invalidate signals against live price
- Order placement wired end-to-end from the Signals page (respecting risk manager limits) with
  order-modify support once MEXC exposes a native amend endpoint
- Email / Telegram / Discord notification delivery wired to real user preferences (channels exist
  in `services/notifications.py`, need per-user subscription + delivery queue)
- Trade journal screenshot upload (object storage) and mistake/tag taxonomy
- Subscription billing integration (Stripe or similar) driving `subscription_tier`
- Backtesting harness to tune the confidence-score weights in `signal_engine.py` against history

**Phase 3 — planned:**
- Replace heuristic SMC/order-flow detectors with a trained ML ranking model on top of the
  existing explainable features (keeping the reason strings — the model re-weights, it doesn't
  replace the explanation)
- TradingView Charting Library (licensed) integration for server-drawn order blocks/FVGs/liquidity
  zones directly on the chart, replacing the current widget-embed + signal-card approach
- Multi-exchange abstraction if expanding beyond MEXC
- SOC2-style audit log retention/export and admin RBAC beyond the current admin/trader/viewer roles

## Disclaimer

This platform surfaces probability-weighted trading setups with full reasoning and risk controls.
It does not and cannot guarantee profit or a 100% win rate — cryptocurrency markets are volatile
and every trade carries risk of loss.
