# Quotex Real Market AI Signals

An independent market-analysis and signal platform for forex, gold and cryptocurrency. It streams live prices from
an authorized independent market-data provider, builds realtime candles, runs ten professional strategies (plus an
AI Strategy Selector), and displays synchronized **CALL / PUT / NO TRADE** signals for **manual** execution on
Quotex or any other trading platform of your choice.

> **This platform never places trades automatically, never scrapes Quotex, never bypasses CAPTCHA/authentication,
> and never requests or stores a Quotex password, session ID or cookie.** It does not guarantee profits or 100%
> accuracy. Prices are supplied by an independent data provider and may differ from prices on Quotex or any other
> platform. Past performance does not guarantee future results.

---

## 1. Project Overview

The platform's job is to turn a live price feed into a transparent, auditable signal:

1. Receive live ticks from a market-data provider (Twelve Data in production, a Mock provider for development).
2. Aggregate ticks into 1m/5m/15m candles, detecting duplicate ticks and missing candles.
3. Compute a large feature set (trend, momentum, volatility, price action, context) from those candles.
4. Classify the current market condition and check it against the selected strategy's compatibility rules.
5. Evaluate one of ten rule-based strategies - or let the **AI Strategy Selector** evaluate all of them and pick
   the strongest, non-conflicting signal.
6. Persist the resulting signal (or NO TRADE) **before** broadcasting it, with a server-time-anchored entry
   window and countdown.
7. Capture the entry price at the exact entry time, and the expiry price at the exact expiry time.
8. Resolve WIN / LOSS / DRAW / DATA_ERROR automatically and broadcast the result - permanently, without allowing
   user edits.
9. Expose everything (assets, strategies, live signals, history, statistics, backtests, admin controls) through a
   versioned REST API and a set of authenticated WebSocket channels.

## 2. Architecture

```
                       ┌─────────────────────────────────────────────────────────┐
                       │                        Frontend (Next.js)                │
                       │  Landing / Auth / Dashboard / Admin - REST + WebSocket   │
                       └───────────────┬───────────────────────┬─────────────────┘
                                       │ REST (/api/v1/*)       │ WebSocket (/ws/*)
                       ┌───────────────▼───────────────────────▼─────────────────┐
                       │                      FastAPI Backend                     │
                       │  Auth · Assets · Strategies · Signals · Backtests · Admin│
                       └───────┬───────────────┬───────────────┬──────────────────┘
                               │               │               │
                     ┌─────────▼───┐   ┌───────▼──────┐  ┌─────▼──────┐
                     │  PostgreSQL │   │    Redis      │  │   Worker   │
                     │  (SQLAlchemy│   │ (pub/sub,     │  │ (ingestion,│
                     │   + Alembic)│   │  runtime cfg) │  │  scheduler)│
                     └─────────────┘   └───────┬───────┘  └─────┬──────┘
                                                │                │
                                       ┌────────▼────────────────▼────────┐
                                       │     Market Data Provider Layer     │
                                       │  Twelve Data · Mock · (Finnhub /   │
                                       │  Polygon / Alpha Vantage stubs)    │
                                       └────────────────────────────────────┘
```

Signal generation pipeline (`app/services/`):

```
tick -> CandleAggregator -> FeatureEngine -> MarketConditionEngine
      -> (Strategy | AI Strategy Selector) -> SignalEngine (NO TRADE filters)
      -> Signal row committed -> Redis publish -> WebSocket broadcast
      -> ResultChecker (entry capture -> expiring -> WIN/LOSS/DRAW/DATA_ERROR)
```

### Monorepo layout

```
/frontend         Next.js 15 (App Router), TypeScript strict, Tailwind, Zustand, Lightweight Charts
/backend          FastAPI, SQLAlchemy 2 (async), Alembic, Celery-free APScheduler worker
/infrastructure   nginx reverse proxy config, Docker assets
/docs             (reserved for additional documentation)
/tests            (reserved for cross-stack/e2e test assets)
docker-compose.yml           Development stack
docker-compose.prod.yml      Production stack
.env.example                 All environment variables
```

### Database schema

All tables from the spec are implemented in `backend/app/models/`: `users`, `assets`, `candles`, `signals`,
`strategies`, `signal_reasons`, `signal_features`, `backtest_runs`, `model_versions`,
`user_strategy_preferences`, `system_events`, `audit_logs`, plus `refresh_tokens` for rotating JWT refresh tokens.
See `backend/alembic/versions/0001_initial_schema.py` for the exact column-level definition.

### REST API

All endpoints are versioned under `/api/v1`. See `backend/app/api/v1/*.py` for the full implementation:

- **Auth**: register, login, refresh (rotating), logout, me
- **Assets**: list, get by symbol, candles, per-symbol expiry availability
- **Strategies**: list, get by code, set user strategy preference
- **Signals**: live, history (paginated), get by id, statistics
- **Backtests**: create, list, get by id
- **Admin**: dashboard, system-health, provider-health, users, strategies (+ activate/deactivate), confidence
  thresholds, models (train/activate/deactivate), signal engine pause/resume, audit logs

### WebSocket channels

| Channel | Purpose | Auth |
|---|---|---|
| `/ws/market/{symbol}?timeframe=1m` | Live/in-progress + completed candles | Public |
| `/ws/signals` | Every new signal, any asset | Public |
| `/ws/signals/{symbol}` | New signals for one asset | Public |
| `/ws/countdown/{signal_id}` | Server-time-anchored timer snapshot (~1 Hz) | Public |
| `/ws/system-time` | Server UTC time broadcast (~1 Hz) | Public |
| `/ws/admin/system-health` | Provider/engine health | Admin JWT required |

Every socket auto-reconnects with exponential backoff on the frontend, and every broadcast channel is backed by
Redis pub/sub so any number of backend workers can fan out the same event.

### Signal lifecycle

```
PENDING_ENTRY --(entry_time reached, price captured)--> ACTIVE
ACTIVE --(within final 10s of expiry)--> EXPIRING
EXPIRING/ACTIVE --(expiry_time reached)--> CHECKING_RESULT --> COMPLETED (WIN | LOSS | DRAW | DATA_ERROR)
PENDING_ENTRY --(entry window closes with no price)--> ENTRY_WINDOW_CLOSED (result = DATA_ERROR)
```

A `Signal` row is written to Postgres the moment a strategy (or the AI Selector) produces a CALL/PUT - *before*
its entry or expiry price exist and *before* it is broadcast over WebSocket. Results, once `COMPLETED`, have no
user-facing edit or delete endpoint; any admin correction must go through an audited action.

### Countdown lifecycle

The backend is the single source of truth for time. Every countdown payload includes `server_time`,
`generated_at`, `entry_time`, `entry_window_end` and `expiry_time`. The frontend computes an `offsetMs` between
`server_time` and its own `Date.now()` once (see `src/store/serverTime.ts`) and re-derives remaining time locally
every 100ms for smooth animation - the timer state itself (`WAITING_FOR_ENTRY -> ENTER_NOW -> ENTRY_WINDOW_CLOSED
-> TRADE_ACTIVE -> EXPIRING -> CHECKING_RESULT -> WIN/LOSS/DRAW/DATA_ERROR`) is always derived from the same
stored timestamps, so a page refresh or WebSocket reconnect never resets it (see `compute_timer_state` in
`backend/app/services/signal_engine/countdown.py`, covered by `backend/tests/test_countdown.py`).

## 3. Local Requirements

- Docker + Docker Compose (recommended path), **or** locally: Python 3.12, Node.js 20+, PostgreSQL 16, Redis 7
- A Twelve Data API key for live mode (free tier works) - <https://twelvedata.com>

## 4. Installation

```bash
git clone <this-repo>
cd Bang
cp .env.example .env
```

## 5. Environment Setup

Edit `.env` (see `.env.example` for the full list). At minimum for local development:

```
APP_ENV=development
MARKET_DATA_PROVIDER=mock       # switch to "twelvedata" for live mode
JWT_SECRET_KEY=<generate a long random string>
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8000
```

Never commit `.env`. Provider API keys are read only on the backend/worker - `NEXT_PUBLIC_*` variables are the
only ones ever exposed to the browser, and none of them are secrets.

## 6. Market-Data API Setup

1. Create a free account at <https://twelvedata.com> and copy your API key.
2. Set `MARKET_DATA_PROVIDER=twelvedata` and `TWELVE_DATA_API_KEY=...` in `.env`.
3. Twelve Data's REST tier delivers historical OHLC candles; its WebSocket delivers quote-level updates rather
   than raw sub-second tick prints, so this platform automatically disables the 15s/30s expiry options when
   Twelve Data is active (see `app/services/market_data/capabilities.py`) rather than presenting an unreliable
   short expiry.
4. Finnhub, Polygon and Alpha Vantage are architecture-ready (`app/services/market_data/unsupported.py`) but not
   yet implemented - see **Known Limitations**.

## 7. Docker Startup

```bash
docker compose up --build
```

This starts Postgres, Redis, the FastAPI backend (auto-runs Alembic migrations on boot), the ingestion/worker
process, the Next.js frontend, and an nginx reverse proxy on `:8080`. Backend directly on `:8000`, frontend on
`:3000`.

## 8. Database Migrations

Migrations run automatically in Docker. To run them manually:

```bash
cd backend
alembic upgrade head          # apply
alembic downgrade -1          # roll back one revision
alembic revision -m "message" # create a new empty revision
```

## 9. Creating the First Admin

```bash
cd backend
python -m scripts.create_admin --email admin@example.com --password "StrongPass123!" --name "Admin"
```

Then seed reference data (idempotent, safe to re-run):

```bash
python -m scripts.seed
```

## 10. Running Mock Mode

Mock mode requires no API key and is the default (`MARKET_DATA_PROVIDER=mock`). It generates a realistic
simulated random walk per asset, builds real candles, and lets the full signal/countdown/result pipeline run
end-to-end. Every signal generated this way carries `provider="mock"` and is never mixed with live-provider
results in statistics.

## 11. Running Live Mode

Set `MARKET_DATA_PROVIDER=twelvedata` and a valid `TWELVE_DATA_API_KEY`, then restart the `backend` and `worker`
services. The `MarketDataManager` automatically fails over to the Mock provider (still clearly tagged
`provider="mock"`) if the live provider disconnects or exceeds `MAX_DATA_LATENCY_MS`, rather than emitting
signals from stale data.

## 12. Testing Strategies

Every strategy is a standalone class under `backend/app/services/strategies/` implementing a common
`BaseStrategy.evaluate()` interface. Run the strategy-focused unit tests with:

```bash
cd backend
pytest tests/test_strategies.py tests/test_market_condition.py -v
```

## 13. Running Backtests

Via the API (requires a logged-in user):

```bash
curl -X POST http://localhost:8000/api/v1/backtests \
  -H "Authorization: Bearer <access_token>" -H "Content-Type: application/json" \
  -d '{"strategy_id": "<id>", "asset_id": "<id>", "timeframe": "1m", "expiry_seconds": 60,
       "start": "2026-01-01T00:00:00Z", "end": "2026-02-01T00:00:00Z", "payout_ratio": 0.85}'
```

Or from the dashboard's **Backtesting** page. The engine (`app/services/backtest/engine.py`) walks candles
strictly chronologically, applies the same entry-window/cooldown/strategy rules as live trading, and reports
win rate, streaks, drawdown, expected value and performance broken down by asset/strategy/expiry/session/hour/
weekday/confidence-range/market-condition/month.

## 14. Training an AI Model

```bash
curl -X POST http://localhost:8000/api/v1/admin/models/train \
  -H "Authorization: Bearer <admin_access_token>" -H "Content-Type: application/json" \
  -d '{"asset_id": "<id>", "strategy_id": "<id>", "timeframe": "1m", "expiry_seconds": 60}'
```

This builds a labeled dataset by walk-forward simulating the strategy across history (see
`app/services/ml/pipeline.py`), splits it **chronologically** (60/20/20 train/validation/test - never shuffled),
trains an XGBoost classifier, calibrates its probabilities on the validation split, and records a new
`ModelVersion` row (inactive by default).

## 15. Activating a Model

```bash
curl -X POST http://localhost:8000/api/v1/admin/models/{model_id}/activate \
  -H "Authorization: Bearer <admin_access_token>"
```

Once active, the signal engine will use that model's calibrated probability as the displayed confidence
(`confidence_type = "ml_calibrated"`) for that asset/strategy pair; if the model fails to load or its feature
schema doesn't match, the engine automatically falls back to rule-based confidence.

## 16. Deploying to a VPS

```bash
cp .env.example .env        # fill in production secrets
docker compose -f docker-compose.prod.yml up -d --build
```

The production compose file runs the backend with multiple Uvicorn workers, builds the frontend in standalone
mode, and exposes only nginx (`:80`/`:443`) to the outside world.

## 17. Configuring Nginx

See `infrastructure/nginx/nginx.conf`. It reverse-proxies `/api/` and `/ws/` to the backend and everything else
to the frontend, rate-limits the API, and sets baseline security headers. Adjust `server_name` and add your TLS
certificate paths under `infrastructure/nginx/certs/` for production.

## 18. Configuring HTTPS

Terminate TLS at nginx (recommended: [certbot](https://certbot.eff.org/) with the webroot or DNS-01 plugin), then
uncomment/add a `listen 443 ssl;` server block referencing your certificate and key, and add a redirect from
`:80` to `:443`. `docker-compose.prod.yml` already exposes `443` and mounts `./infrastructure/nginx/certs`.

## 19. Database Backup

```bash
docker compose exec postgres pg_dump -U quotex_signals quotex_signals > backup_$(date +%F).sql
# restore:
docker compose exec -T postgres psql -U quotex_signals quotex_signals < backup_2026-07-31.sql
```

Automate this with a cron job on the host and store backups off-box.

## 20. Security Checklist

- [x] Argon2 password hashing (never logs plaintext passwords)
- [x] JWT access tokens + rotating, Argon2-hashed refresh tokens
- [x] Role-based access control (`user` / `admin`) enforced via FastAPI dependencies
- [x] Account lockout after 5 failed logins (15-minute cooldown)
- [x] CORS allowlist via `CORS_ORIGINS`
- [x] Structured logging with automatic redaction of password/token/API-key fields
- [x] Market-data API keys never leave the backend/worker process
- [x] Audit log for every admin mutation (user updates, strategy toggles, model activation, signal engine
      pause/resume)
- [x] Completed signal results have no user-facing edit/delete endpoint
- [x] WebSocket admin channel requires an admin JWT; all sockets rate-limited and heartbeat-monitored
- [ ] Email verification and password-reset flows are architected (see `email_verified` column, hashed-token
      pattern reused from refresh tokens) but not yet wired to an email provider - see Known Limitations.

Before going to production: rotate `JWT_SECRET_KEY`, set `APP_ENV=production`, restrict `CORS_ORIGINS`, put
Postgres/Redis behind a private network (see `docker-compose.prod.yml`), and enable HTTPS.

## 21. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Backend fails to start with a DB connection error | Postgres isn't ready yet - Docker Compose's healthcheck should handle this; standalone, wait for `pg_isready`. |
| All signals are NO TRADE forever | Check `/api/v1/admin/provider-health` - if `connected: false` or latency is high, the feed is unhealthy by design (a NO TRADE filter). |
| 15s/30s expiries are greyed out | Expected on Twelve Data - see section 6. Switch to `mock` to see all expiries during development. |
| Countdown looks stuck at 0 | The `worker` service (which runs the lifecycle ticker) may not be running - check `docker compose logs worker`. |
| WebSocket keeps reconnecting | Check `NEXT_PUBLIC_WEBSOCKET_URL` matches your backend's actual scheme/host (`ws://` vs `wss://`). |

## 22. Known Limitations

This is a complete, runnable reference implementation of the full spec's architecture, with the following
deliberate scope reductions, called out explicitly rather than silently:

- **Finnhub / Polygon / Alpha Vantage** are architecture-ready stubs (`app/services/market_data/unsupported.py`)
  that raise `NotImplementedError`; only Twelve Data and the Mock provider are fully implemented. Adding one is a
  matter of subclassing `MarketDataProvider` the same way `TwelveDataProvider` does.
- **Live signal generation** runs all ten strategies plus one AI Auto evaluation per enabled asset on the 1-minute
  timeframe at a default 60s expiry when a candle closes (`app/worker/ingestion.py`). Per-user, per-expiry
  on-demand live generation across every possible (asset, strategy, expiry) combination simultaneously is not
  implemented; backtesting and the REST API do support arbitrary strategy/asset/expiry/timeframe combinations.
- **Email verification and password reset** have their data model and hashed-token pattern in place but are not
  wired to an outbound email provider (SMTP/SES/etc.) - registering leaves `email_verified=False` with no email
  actually sent yet.
- **Admin frontend** is consolidated onto a single `/admin` overview page (dashboard stats, strategy
  enable/disable, signal-engine pause/resume, user list) rather than the full set of separate admin sub-pages
  described in the spec; every corresponding backend endpoint exists and is covered by tests.
- **UI component library**: components are hand-built with Tailwind rather than the shadcn CLI scaffold, since
  the CLI's interactive/network-fetching flow isn't available in this build environment. Visual/behavioral intent
  (glass panels, dark/light mode, accessible badges) matches the spec.
- No signal, strategy or AI mode in this codebase guarantees profit or 100% accuracy - by design, and this is
  reflected in the UI copy, the confidence-threshold system, and the required risk disclosures.
