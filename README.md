# FlexX Signal

A real-time binary-options **signal and analysis platform**. FlexX Signal analyzes market structure,
momentum, candle patterns, support/resistance, breakouts and multi-timeframe confirmation to publish
calibrated, transparent "High Confidence Signal" indicators.

**FlexX Signal is a signal and analysis platform only.** It never executes trades, never stores
trading-platform (e.g. Quotex) credentials, cookies, or session tokens, and never claims guaranteed
profits. Every win, loss, tie and canceled signal is recorded and shown transparently.

---

## Table of contents

- [Technology stack](#technology-stack)
- [Solution layout](#solution-layout)
- [Prerequisites](#prerequisites)
- [Visual Studio setup](#visual-studio-setup)
- [PostgreSQL setup](#postgresql-setup)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [Running the backend](#running-the-backend)
- [Running the frontend](#running-the-frontend)
- [Running with Docker Compose](#running-with-docker-compose)
- [Default development accounts](#default-development-accounts)
- [CSV candle import format](#csv-candle-import-format)
- [Adding an authorized live data provider](#adding-an-authorized-live-data-provider)
- [Adding a new strategy](#adding-a-new-strategy)
- [Running tests](#running-tests)
- [Production deployment](#production-deployment)
- [Security notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [What's fully built vs. scaffolded](#whats-fully-built-vs-scaffolded)

---

## Technology stack

**Backend:** .NET 8, ASP.NET Core Web API, C#, Entity Framework Core, PostgreSQL, ASP.NET Core
Identity, JWT + refresh tokens, FluentValidation, Serilog, SignalR, Swagger/OpenAPI, xUnit,
StackExchange.Redis (distributed cache).

**Frontend:** React 19, TypeScript (strict), Vite, Tailwind CSS, React Router, TanStack Query, React
Hook Form, Zod, `@microsoft/signalr`, TradingView Lightweight Charts, Recharts, Zustand.

**DevOps:** Docker, Docker Compose, Nginx.

## Solution layout

```
FlexXSignal.sln
src/
  FlexXSignal.Domain          Entities, enums (no external dependencies but ASP.NET Identity types)
  FlexXSignal.Application     DTOs, service interfaces, FluentValidation validators
  FlexXSignal.Infrastructure  EF Core, Identity, JWT, market data providers, all service implementations
  FlexXSignal.SignalEngine    Indicators, candle/structure analysis, 7 strategies, confidence engine,
                               no-trade filters, backtesting-safe result verification
  FlexXSignal.Api             Controllers, SignalR hub, middleware, Serilog, background services, seeder
tests/
  FlexXSignal.Tests           xUnit: engine, auth, authorization, subscriptions, audit log, no-lookahead
flexxsignal-client/           React frontend (public site, authenticated app, admin panel)
docker/nginx/                 Production Nginx reverse-proxy configuration
```

## Prerequisites

- .NET 8 SDK
- Node.js 20+ and npm
- PostgreSQL 14+ (or Docker)
- (Optional) Redis 7+ — the app runs without it using an in-process cache fallback
- (Optional) Docker + Docker Compose for the containerized setup

## Visual Studio setup

1. Open `FlexXSignal.sln` in Visual Studio 2022 (17.8+, with the ASP.NET and web development
   workload, and the .NET 8 SDK component).
2. Set `FlexXSignal.Api` as the startup project.
3. Restore NuGet packages (Visual Studio does this automatically on load, or run
   `dotnet restore` from the repo root).
4. Follow [PostgreSQL setup](#postgresql-setup) and [environment variables](#environment-variables)
   below before pressing F5.

## PostgreSQL setup

**Local install:**

```bash
sudo apt-get install postgresql   # or your platform's equivalent
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
sudo -u postgres psql -c "CREATE DATABASE flexxsignal;"
```

**Or via Docker (just the database, for local `dotnet run` development):**

```bash
docker run -d --name flexxsignal-postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=flexxsignal -p 5432:5432 postgres:16-alpine
```

The default connection string in `src/FlexXSignal.Api/appsettings.json` is:

```
Host=localhost;Port=5432;Database=flexxsignal;Username=postgres;Password=postgres
```

Adjust it (or override via `ConnectionStrings__Default`) to match your setup.

## Environment variables

| Variable | Purpose | Required |
|---|---|---|
| `ConnectionStrings__Default` | PostgreSQL connection string | Yes (has a local dev default) |
| `ConnectionStrings__Redis` | Redis connection string; falls back to in-memory cache if unset | No |
| `Jwt__Secret` | HMAC-SHA256 signing key, 32+ chars | Yes for production |
| `SEED_SUPERADMIN_PASSWORD` | Password for the seeded SuperAdmin account | Recommended — insecure dev default used with a warning if unset |
| `SEED_PREMIUM_PASSWORD` | Password for the seeded demo Premium user | Recommended — same as above |
| `Seed__SuperAdminEmail` / `Seed__PremiumUserEmail` | Override seeded account emails | No |
| `Cors__AllowedOrigins__0` | Allowed frontend origin(s) | Yes |
| `Telegram__BotToken` | Enables live Telegram notifications | No |

Copy `.env.example` to `.env` for Docker Compose, or set these as environment variables /
`dotnet user-secrets` for local `dotnet run` / Visual Studio.

## Database migrations

```bash
dotnet tool install --global dotnet-ef   # once
dotnet ef database update \
  --project src/FlexXSignal.Infrastructure \
  --startup-project src/FlexXSignal.Api
```

The API also calls `Database.MigrateAsync()` automatically on startup, so this step is optional for
local development — it exists mainly for controlled production rollouts and CI.

To add a new migration after changing an entity:

```bash
dotnet ef migrations add YourMigrationName \
  --project src/FlexXSignal.Infrastructure \
  --startup-project src/FlexXSignal.Api \
  --output-dir Persistence/Migrations
```

## Running the backend

```bash
export SEED_SUPERADMIN_PASSWORD='ChangeMe123!'
export SEED_PREMIUM_PASSWORD='ChangeMe123!'
dotnet run --project src/FlexXSignal.Api
```

The API listens on the URL printed at startup (typically `http://localhost:5080` in this repo's
`launchSettings.json`). Swagger UI is available at `/swagger` in Development. Health check: `/health`.

On first run the database is migrated and seeded automatically (SuperAdmin + demo Premium user,
subscription plans, trading pairs, all 7 strategies, three days of demo candle history, and 40 demo
signals with real win/loss/tie outcomes).

## Running the frontend

```bash
cd flexxsignal-client
cp .env.example .env.local   # adjust VITE_API_BASE_URL / VITE_HUB_URL if the API isn't on :5080
npm install
npm run dev
```

Opens on `http://localhost:5173`.

## Running with Docker Compose

```bash
cp .env.example .env
# edit .env: set JWT_SECRET, SEED_SUPERADMIN_PASSWORD, SEED_PREMIUM_PASSWORD at minimum
docker compose up -d --build
```

This starts PostgreSQL, Redis, the API, the built React app (served by its own Nginx), and a
front-facing Nginx reverse proxy on `http://localhost:${HTTP_PORT:-8080}` that routes `/api/*` and
`/hubs/*` to the backend and everything else to the frontend. Health check: `http://localhost:8080/health`.

> If port `5432` is already in use on your machine, set `POSTGRES_PORT` in `.env` to something else
> (Postgres is only exposed to the host for convenience; containers always talk to each other over the
> internal `postgres:5432` service name).

## Default development accounts

Created by the seeder on first run — **change these passwords before deploying anywhere shared**:

| Role | Email | Password |
|---|---|---|
| SuperAdmin | `admin@flexxsignal.local` (or `Seed__SuperAdminEmail`) | value of `SEED_SUPERADMIN_PASSWORD` |
| PremiumUser (demo) | `demo@flexxsignal.local` (or `Seed__PremiumUserEmail`) | value of `SEED_PREMIUM_PASSWORD` |

If the environment variables are not set, the seeder falls back to an insecure development-only
default (`ChangeMe123!`) and logs a warning — never rely on this outside a local sandbox.

## CSV candle import format

Used for backtesting and historical seeding via Admin → Market Pairs → Import CSV, or the
`CsvMarketDataProvider`. Header row required, columns in any order:

```csv
Timestamp,Open,High,Low,Close,Volume,Pair,Timeframe
2026-01-01T00:00:00Z,1.10234,1.10256,1.10198,1.10241,1523,EURUSD,60
2026-01-01T00:01:00Z,1.10241,1.10265,1.10233,1.10250,1310,EURUSD,60
```

- `Timestamp`: ISO-8601, UTC.
- `Timeframe`: candle period in **seconds** (`15`, `30`, `60`, `300`, `900`).
- `Pair`: must match a `TradingPair.Symbol` already configured in Admin → Market Pairs.
- Rows that fail OHLC consistency checks (`High >= max(Open,Close)`, `Low <= min(Open,Close)`) are
  skipped and reported back, not silently dropped.

## Adding an authorized live data provider

The architecture ships with two ready-to-configure templates in
`src/FlexXSignal.Infrastructure/MarketDataProviders/`:

- **`AuthorizedWebSocketDataProvider`** — real-time streaming. Connection handling, exponential
  backoff reconnection, subscribe/unsubscribe, OHLC validation and data-quality tagging are complete.
  You supply: the `wss://` endpoint, an API key, and adjust `TryParseAndDispatch` to match your
  vendor's exact message schema (a sensible default JSON shape is assumed and documented inline).
- **`AuthorizedRestDataProvider`** — historical backfill. HTTP client, retry-with-backoff, and
  response parsing are complete. You supply: the base URL, an API key, and adjust
  `BuildRequestUri` / `ParseResponse` to match your vendor's contract.

To activate one:

1. Go to **Admin → Data Provider Settings → New provider**.
2. Choose **Authorized WebSocket** or **Authorized REST**, enter the endpoint and API key (encrypted
   at rest via ASP.NET Core Data Protection), and mark it **active**.
3. The background services (`MarketDataIngestionService`, `ProviderReconnectionService`) pick up the
   change automatically via `IMarketDataProviderResolver` — no restart required.

Neither template will ever request or store a *trading platform's* login credentials — only a market
data vendor's API key.

## Adding a new strategy

1. Implement `ITradingStrategy` in `src/FlexXSignal.SignalEngine/Strategies/` (see the 7 existing
   strategies for the pattern — inherit `StrategyBase`, implement `EvaluateCore`).
2. Register it in `FlexXSignal.Infrastructure.DependencyInjection.AddInfrastructure`:
   `services.AddSingleton<ITradingStrategy, YourStrategy>();`
3. Add a matching `Strategy` + `StrategyVersion` row (via Admin → Strategies, or a migration/seed
   entry) with a `Key` equal to your strategy's `Key` property.
4. It's immediately available to `SignalScanningService`, `BacktestService`, and the admin
   strategy-tuning UI — confidence weights and parameters are configurable without redeploying code.

## Running tests

```bash
dotnet test tests/FlexXSignal.Tests
```

62 tests covering: signal direction per strategy, confidence scoring (deterministic, calibration),
candle pattern detection, market structure (swings, zones, breakouts, liquidity sweeps), the no-trade
filter pipeline, result verification (Win/Loss/Tie rules), backtesting **without look-ahead bias**
(two datasets identical up to a divergence point must produce identical decisions before that point),
authentication (register/login/lockout/refresh-rotation), role-based authorization at the live HTTP
layer, subscription-plan access rules, and audit logging.

Some tests (`FlexXSignal.Tests.Api.*`) start the real API against PostgreSQL — have a database
reachable (see [PostgreSQL setup](#postgresql-setup)) before running the full suite.

## Production deployment

1. Set real secrets: `Jwt__Secret` (32+ random chars), `SEED_SUPERADMIN_PASSWORD`,
   `SEED_PREMIUM_PASSWORD`, and a strong `POSTGRES_PASSWORD` — never commit these.
2. Set `Cors__AllowedOrigins__0` to your real frontend origin.
3. Point `ConnectionStrings__Redis` at a real Redis instance for multi-instance deployments (the
   in-memory cache fallback is per-process and won't stay consistent across replicas).
4. Build and push images: `docker compose build`, then deploy `docker-compose.yml` (or translate it
   to your orchestrator of choice — the images are plain multi-stage Docker builds).
5. Put a real TLS-terminating layer in front of `docker/nginx/nginx.conf` (a managed load balancer,
   or extend that config with a `listen 443 ssl` server block and your certificate).
6. Configure an authorized market data provider (see above) — the Demo provider is clearly labeled
   and intended for development only.
7. Review [Security notes](#security-notes) below.

## Security notes

- Passwords are hashed via ASP.NET Core Identity (PBKDF2). Account lockout after 5 failed attempts.
- JWT access tokens (15 min default) + rotating refresh tokens (14 days default, hashed at rest,
  single-use — reuse of a rotated token is rejected).
- Market-data-provider API keys are encrypted at rest via ASP.NET Core Data Protection.
- Rate limiting: global per-IP limit, plus a stricter limit on `/api/auth/*`.
- Global exception handling never leaks stack traces or connection strings to clients.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`) applied to every
  response, plus the same on the Nginx layer.
- Audit log covers every admin mutation and every manual signal-result correction (old value, new
  value, actor, reason, timestamp — corrections never silently overwrite a verified result).
- No trading-platform credentials, cookies, or session tokens are ever requested or stored.
- Secrets are read from environment variables / `.env` (gitignored) — never hardcoded.

## Troubleshooting

- **`dotnet ef` command not found** — `dotnet tool install --global dotnet-ef`, then ensure
  `~/.dotnet/tools` is on your `PATH`.
- **API fails to start with a Postgres connection error** — confirm the server is running and the
  connection string's host/port/credentials match; in Docker Compose the host must be `postgres`, not
  `localhost`.
- **Frontend can't reach the API (CORS error)** — confirm `Cors__AllowedOrigins__0` matches the exact
  origin the frontend is served from (scheme + host + port).
- **No live signals ever appear** — this is often correct behavior, not a bug: the engine only
  publishes when every no-trade filter passes and confidence clears the admin threshold (80% by
  default). Check Admin → Signal Monitoring and Admin → Data Health for what's being filtered. You can
  always create a signal manually from Admin → Signal Monitoring to exercise the rest of the pipeline.
- **Docker build fails to reach NuGet/npm** — this is a network/proxy issue in your build environment,
  not the Dockerfiles; both restore over plain HTTPS with no special configuration required.
- **Port 5432 already in use** when running Docker Compose — set `POSTGRES_PORT` in `.env`.

## What's fully built vs. scaffolded

Everything in this repository is real, working code — there are no stub methods, fake data paths, or
dead buttons. Two areas are intentionally left as **structured extension points**, exactly as the
product brief requires, because they need credentials only you can supply:

- **Authorized live market data** (`AuthorizedWebSocketDataProvider`, `AuthorizedRestDataProvider`):
  connection handling, reconnection, parsing pipeline and validation are complete; you provide the
  vendor endpoint, API key, and confirm the message-schema mapping matches your vendor.
- **Outbound email** (`ConsoleEmailSender`): logs the message instead of sending it in development, so
  no SMTP credentials are required to run the app locally. Swap in an SMTP/SendGrid implementation of
  `IEmailSender` for production. Telegram notifications *are* fully live once `Telegram__BotToken` is set.

Everything else — the full signal engine (7 strategies, weighted+calibrated confidence, no-trade
filters), backtesting with look-ahead-bias tests, all REST endpoints, SignalR real-time updates, the
complete React frontend (public site, authenticated app, 16-page admin panel), background services,
seed data, and the Docker Compose stack — is implemented and has been run end-to-end during
development of this repository.
