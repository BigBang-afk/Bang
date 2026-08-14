# Lumenex — Architecture

AI-powered trading analytics SaaS. This document is the architecture reference
produced before implementation and kept up to date as phases ship. Phase 1
(this repo's current state) covers foundation only — see
[Development phases](#9-development-phases) for what's next.

## 1. Recommended architecture

- **Framework**: Next.js (App Router), TypeScript, server-first — pages are
  Server Components by default; interactivity is isolated into small Client
  Components (`"use client"`) only where needed (forms, dropdowns, the risk
  calculator).
- **Styling**: Tailwind CSS v4 + shadcn/ui (Base UI primitives), CSS custom
  properties for theming (see [Component architecture](#7-component-architecture)).
- **Data**: Supabase (Postgres + Auth). All reads/writes from the app go
  through Supabase's client libraries; Row Level Security (RLS) is the
  primary authorization boundary, not application code.
- **Deployment**: Vercel (Next.js) + Supabase (managed Postgres/Auth).
- **AI**: Claude API, called only from server-side code (Route
  Handlers/Server Actions) — never from the browser. Every call is logged to
  `ai_analyses` (Phase 3).
- **Charts**: TradingView Lightweight Charts, client-side only (Phase 2).

Rendering strategy: marketing pages are dynamic-but-cacheable (they read the
signed-in user for the header CTA); dashboard/admin pages are fully dynamic
(`ƒ` in the Next.js build output) since they're per-user and behind auth.

## 2. Folder structure

```
src/
  app/
    (marketing)/          Public site: layout with header/footer, "/" and "/pricing"
    (auth)/                Centered auth layout: /login, /register, /forgot-password
    auth/callback/         Route Handler: Supabase email/OAuth code exchange
    (dashboard)/dashboard/ Authenticated app shell + all trader-facing pages
    (admin)/admin/         Admin-only shell + all admin pages
    api/                   Route Handlers for anything not a page (health, etc.)
  components/
    ui/                    shadcn/ui primitives (generated, low-level)
    marketing/              Landing page sections
    auth/                   Auth forms
    dashboard/               Dashboard-specific components
    admin/                    Admin-specific components
    shared/                 Cross-cutting: sidebar, topbar, page header, empty state
  lib/
    supabase/               Browser/server/service-role Supabase clients + middleware helper
    auth/                    Session/role helpers (requireUser, requireAdmin)
    actions/                Server Actions (auth, watchlist, journal, profile, admin)
    config/                  Site metadata, nav items — not hard-coded in components
    validations/             Zod schemas
    plans.ts, rate-limit.ts  Plan data access, in-memory rate limiter
    market-data/             Provider abstraction, registry, Binance.US provider
    technical-analysis/      Indicators, no-repaint candle split, scoring engine, scanner
  types/
    database.ts             Hand-written mirror of the SQL schema (Database type)
supabase/
  migrations/0001_init.sql   Full schema, RLS policies, seed data
docs/
  ARCHITECTURE.md            This file
resources/
  pine-scripts/               Reference TradingView Pine Script indicators
```

Route groups (`(marketing)`, `(auth)`, `(dashboard)`, `(admin)`) don't affect
URLs — they exist purely to give each area of the app its own `layout.tsx`.

## 3. Database architecture

Full schema: [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql).

Design principles:

- **UUIDs** (`gen_random_uuid()`) for all primary keys except `roles`, which
  is a tiny fixed reference table (smallint id).
- **Every table has `created_at`**; mutable tables also have `updated_at`,
  kept current by a shared `set_updated_at()` trigger — never set manually
  by application code.
- **Money as integer cents** (`price_monthly_cents`, `amount_cents`), never
  floats, to avoid rounding drift.
- **Market-agnostic**: `market_assets.market_type` is an enum
  (`crypto | forex | metals | indices | stocks`); no table or column is
  named after a single asset class. Adding a market means inserting rows,
  not migrating schema.
- **Plans are data**: `plans` + `plan_features` hold pricing, trial length
  and a `limits` JSONB column (watchlists/alerts/AI-analyses-per-day caps).
  The landing page, pricing page and subscription page all read this table
  — prices are never hard-coded in components.
- **No secrets in the database.** Payment provider fields
  (`stripe_product_id`, `payment_provider_customer_id`, ...) store opaque
  references only; actual API keys live in environment variables.

Tables: `roles`, `profiles`, `plans`, `plan_features`, `subscriptions`,
`payments`, `market_assets`, `watchlists`, `watchlist_items`, `ai_analyses`,
`trading_setups`, `trade_journal`, `alerts`, `usage_tracking`, `audit_logs`.

A trigger on `auth.users` (`handle_new_user`) automatically creates a
`profiles` row and an `active` Free-plan `subscriptions` row for every new
signup, so every user has a plan from the moment they register.

### Entitlement system (Phase 3)

`src/lib/entitlements.ts` is the single place that answers "is this user
allowed to do X" — Server Components and Server Actions call it, nothing
else decides entitlement. Two independent mechanisms, both pure data:

- **Numeric limits** (`plans.limits` jsonb — e.g. `watchlists: 3`).
  `checkUsageLimit()` counts a *capacity* resource (current row count vs.
  cap — watchlists, watchlist items, alerts, saved setups, journal
  entries); `checkDailyUsageLimit()` counts a *rate* resource (rows in
  `usage_tracking` since UTC midnight — AI analyses, scanner requests).
  `recordUsage()` appends to `usage_tracking` after a gated action
  succeeds.
- **Qualitative features** (`plan_features` rows — e.g.
  `csv_export`). `hasFeatureAccess()` checks whether a
  `(plan_id, feature_key)` row exists; absence means "not included," so
  only positive rows are ever stored.

`getUserPlan()` resolves a user's entitling plan (their
active/trialing/past_due subscription's plan, falling back to Free) and
is the base every other function builds on. Every gated Server Action
(e.g. `createWatchlistAction`) calls `checkUsageLimit()` *before* writing
— the UI may also disable a button near the limit, but that's a
convenience, never the actual gate, per the "verify server-side" security
requirement.

## 4. Authentication architecture

- **Provider**: Supabase Auth (email/password in Phase 1; OAuth providers
  can be added later without schema changes).
- **Session storage**: httpOnly cookies via `@supabase/ssr`, refreshed on
  every request by `src/middleware.ts` → `lib/supabase/middleware.ts`.
- **Three Supabase client variants** (`lib/supabase/`):
  - `client.ts` — browser client (anon key), for Client Components.
  - `server.ts` `createClient()` — server client (anon key, cookie-bound),
    for Server Components/Actions/Route Handlers. RLS still applies, scoped
    to the caller's session.
  - `server.ts` `createServiceRoleClient()` — service-role client that
    bypasses RLS. Used only for trusted server-only operations (e.g. the
    Auth Admin API to list user emails on the admin Users page). Throws if
    `SUPABASE_SERVICE_ROLE_KEY` is unset, and is never imported into
    anything that ships to the browser.
- **Route protection is layered**:
  1. `middleware.ts` redirects signed-out visitors away from
     `/dashboard/*` and `/admin/*`, and signed-in users away from the auth
     pages.
  2. Each protected layout calls `requireUser()`/`requireAdmin()`
     (`lib/auth/session.ts`) again — so a route is never protected by
     middleware matching alone.
  3. RLS policies enforce the same rules at the database layer
     (`public.is_admin()`), so even a server-side bug in (1)/(2) can't leak
     another user's rows.

## 5. API architecture

Phase 1 uses **Server Actions** (`lib/actions/*.ts`) for all mutations —
watchlists, journal entries, profile updates, role changes — rather than a
separate REST/JSON API. Benefits: progressive enhancement (forms work
without client JS), automatic CSRF protection from Next.js, and no need to
hand-roll request validation plumbing.

Route Handlers (`app/api/*`, `app/auth/callback`) are reserved for cases
that aren't a form submission: OAuth/email-confirmation callbacks, (in
later phases) webhooks from Stripe, and anything a Client Component needs
to poll/refetch dynamically — which is exactly what `app/api/market-data/*`
is for (Phase 4): the Charts and Markets pages need to refetch on a timer
and on user interaction (symbol/timeframe changes) without a full page
navigation, so they call these routes instead of a Server Action.

Every Server Action:

1. Re-authenticates via `requireUser()`/`requireAdmin()` — never trusts the
   client.
2. Validates input with Zod before touching the database.
3. Lets Supabase RLS make the final authorization call on the write itself.

Every market-data Route Handler (`app/api/market-data/*`) additionally:

1. Requires a signed-in user (`getCurrentProfile()`) and rate-limits per
   user (`lib/rate-limit.ts`) — these routes are cheap for us to call but
   not free, so they're not left open to anonymous/unbounded polling.
2. Resolves the requested symbol against `public.market_assets` server-side
   — the client only ever sends a symbol string, never a market type, so
   it can't spoof which provider/market a symbol resolves to.
3. Delegates to `lib/market-data/index.ts`, which is the only code that
   knows which provider serves which market (`lib/market-data/registry.ts`)
   — routes never import a provider implementation directly.
4. Maps `MarketDataError` codes to HTTP status codes consistently
   (`invalid_symbol`→400, `unsupported_market`→404, `rate_limited`→429,
   `provider_unavailable`/`network_error`→502).

### Market data provider abstraction (Phase 4)

`src/lib/market-data/types.ts` defines the `MarketDataProvider` interface
every data source implements: `getMarkets()`, `getTicker()`, `getOHLCV()`,
`getMarketStatus()`, and an optional `getOrderBook()`. `capabilities`
declares which market types, timeframes and latency class (`realtime` vs
`delayed`) a provider supports, so the app never assumes a provider covers
more than it actually does.

`src/lib/market-data/registry.ts` maps each `market_type` to the provider
currently serving it — the **only** place a concrete provider
implementation gets wired into the app. Today: `crypto` → Binance.US
(`providers/binance.ts`), real public market data, no API key required.
`forex`/`metals`/`indices` have no entry — deliberately, since no free,
key-less provider offers real intraday OHLCV for them (see
`.env.example`). Calling `getTicker()`/`getOHLCV()` for an unsupported
market throws `MarketDataError("unsupported_market", ...)` rather than
fabricating data — the UI (Charts, Markets, System Status) surfaces this
honestly instead of hiding it. Adding a provider is: implement the
interface, add its key to env vars, add one line to the registry.

### Technical analysis & scanner engine (Phase 5)

`src/lib/technical-analysis/` is a pure, provider-agnostic layer computed
entirely from `OHLCVCandle[]` — it never calls a market-data provider
itself, so it's unit-testable without network access:

- **`indicators.ts`**: SMA, EMA, RSI, MACD, ATR, Bollinger Bands, VWAP,
  average/relative volume, momentum, and ADX (+DI/-DI), all pure functions
  over index-aligned `Array<number | null>` series (`null` during
  warm-up). All periods are parameters, not constants, so settings are
  configurable end-to-end.
- **`candles.ts`** (`splitClosedAndForming`): the no-repaint guardrail.
  Every provider response may include a still-forming candle (its close
  time is in the future); this function splits it off so indicator math
  only ever runs on fully closed candles. The forming candle, if present,
  is only ever suitable for display as a live price — feeding it into an
  indicator would make historical values change retroactively as the
  candle continues to form, which is exactly what "no repainting" rules
  out.
- **`scoring.ts`** (`analyzeSymbol`): a transparent scoring engine — every
  field on `TechnicalSnapshot` traces back to a named, inspectable rule
  (trend confirmation via EMA/ADX, momentum agreement, volume
  confirmation, price-structure confirmation, volatility condition).
  `supportingConditions`/`conflictingConditions` list the exact rules that
  fired in plain language; `setupType` is only ever set when the score
  clears a threshold *and* there's supporting evidence. This is
  decision-support, not a prediction — the scanner UI states that
  explicitly, and no code path claims a guaranteed signal.
- **`scanner.ts`** (`runScan`): queries `market_assets` for the requested
  market/symbol filter, and for each asset fetches OHLCV, splits
  closed/forming, scores the closed candles, and applies the requested
  filters (trend/volatility/momentum/volume/RSI range/EMA condition).
  Markets with no connected provider return every asset as
  `unsupportedCount` rather than a fabricated snapshot; a single symbol's
  provider error only drops that symbol, not the whole scan.

`app/api/scanner/route.ts` wraps this the same way the market-data routes
do: `authorizeMarketDataRequest()` (auth + per-user rate limit), then
`checkDailyUsageLimit(userId, "scanner_requests_per_day")` (429 with a
plan-upgrade message once exceeded), then `recordUsage()` on success — so
scanning is entitlement-gated the same way AI analyses are, per the
Phase 3 entitlement system. `/dashboard/scanner` is a client panel
(`components/dashboard/scanner-panel.tsx`) with the full filter set
(Market, Symbol, Timeframe, Trend, Volatility, Momentum, Volume, RSI
range, EMA condition) and a results table (Symbol, Current price, Trend,
Momentum, Volatility, Technical score, Last update); each row expands to
show the setup type, risk level, and the supporting/conflicting
conditions the score is built from, so the "why" is never hidden behind a
single number.

Unit tests (`*.test.ts` next to each module, run via `npm test` /
`vitest`) cover indicator math against hand-computed values, the
closed/forming split (including that an anomalous forming candle never
leaks into an indicator), and scoring edge cases (flat price action
resolving to neutral rather than defaulting bearish, setups never being
named without a qualifying score).

### AI market analysis engine (Phase 6)

`src/lib/ai/` integrates the Claude API on top of everything Phase 4/5
already computed — it never talks to a market-data provider itself and
never invents a value the rest of the app can't already back up:

- **`types.ts`** (`AnalysisInputSnapshot`): the entire, exhaustive set of
  data the AI is allowed to see for one symbol/timeframe — price (last
  *closed* candle, same no-repaint discipline as the scanner), 24h change,
  market status, a bounded window of recent candles, the full indicator
  readout (EMA/RSI/MACD/ATR/Bollinger/ADX/relative volume/momentum),
  trend/momentum/volatility/volume state, the scanner's technical score
  and setup type, and support/resistance levels. Every field traces back
  to a real computed value; a field that genuinely has no data is `null`,
  never guessed.
- **`levels.ts`** (`findSupportResistanceLevels`, in
  `technical-analysis/`): detects support/resistance from clustered swing
  highs/lows in closed candles — pure and unit-tested like the rest of the
  technical-analysis package.
- **`prompt.ts`**: the system prompt and user-prompt builder, both
  server-only and reused for every request (never built from raw user
  text — the only input is `AnalysisInputSnapshot`, assembled entirely
  server-side). The system prompt is explicit and non-negotiable about the
  brief's constraints: never fabricate data, `confidence_score` is an
  analytical agreement score and *not* a probability of profit, and never
  claim a guaranteed profit, guaranteed win rate, 100% accuracy, or
  risk-free trading.
- **`schema.ts`**: the zod schema every response must satisfy
  (`market_bias`, `trend`, `momentum`, `volatility`, `key_levels`,
  `bullish_factors`, `bearish_factors`, `invalidation_conditions`,
  `setup_quality`, `confidence_score`, `explanation`, `risk_notes`),
  `parseAnalysisOutput()` for validating arbitrary JSON against it, the
  typed `AIAnalysisError` used everywhere in this module, and
  `AI_ANALYSIS_ERROR_STATUS` — the error-code → HTTP-status table the API
  route reads from, kept in `schema.ts` rather than inlined in the route so
  it's independently unit-tested.
- **`client.ts`**: the only place that calls the Claude API. Uses
  structured outputs (`client.messages.parse` + `zodOutputFormat` built
  from the same zod schema, not a hand-duplicated JSON schema) so a
  malformed response is a validation failure, not a parsing crash; a
  30-second request timeout maps to a typed `timeout` error; a
  `stop_reason: "refusal"` maps to a typed `refused` error; and
  `parsed_output` is re-validated through `parseAnalysisOutput()` even
  though structured outputs already enforced the schema server-side, so
  there's exactly one source of truth for "is this a valid analysis."
- **`analyze.ts`** (`runAnalysis`): the orchestrator. Builds the snapshot,
  calls Claude, and persists the result to `ai_analyses` for every
  request — cache hit or not — so per-user history and admin usage
  monitoring both see everything (`status: "failed"` rows are written on
  any error too, which is exactly what the `admin/ai-usage` dashboard's
  "Failed" counter has been reading since Phase 1). A short-lived
  in-memory cache, keyed by asset + timeframe (same documented
  single-process limitation as `lib/rate-limit.ts`), lets a burst of
  requests for the same hot symbol reuse one Claude call — real cost
  control, not just a nice-to-have. Snapshot-building, generation, and
  persistence are all injected dependencies, so `analyze.test.ts` exercises
  the cache/error/persistence logic without a network or database call.

`app/api/ai-analysis/route.ts` follows the same shape as the market-data
and scanner routes: `authorizeMarketDataRequest` (auth + per-user rate
limit), then `checkDailyUsageLimit(userId, "ai_analyses_per_day")` (429
with an upgrade message once exceeded — the same entitlement key Phase 3
already defined for this), then `resolveAsset()` to reject an unknown
symbol before ever building a snapshot, then `runAnalysis()`. Errors map
through `AI_ANALYSIS_ERROR_STATUS` (unsupported market → 404, insufficient
history → 422, timeout → 504, upstream/AI provider failure → 502,
malformed output → 502). `/dashboard/ai-analysis` is a client panel
(`components/dashboard/ai-analysis-panel.tsx`) with symbol/timeframe
selection, an Analyze button, and a results view covering every field the
brief asked for (bias/trend/momentum/volatility, key levels, supporting
and conflicting factors, invalidation conditions, setup quality,
confidence score, explanation, risk notes, timestamp, model) plus an
expandable "data used for this analysis" panel so a user can see exactly
what the AI was and wasn't given.

### Trading setups, risk management & journal (Phase 7)

`src/lib/trading/` is a pure-math package, deliberately independent of
Supabase, Next.js, and the AI/market-data layers — every function takes
plain numbers in and returns plain numbers out, which is what makes it
exhaustively unit-tested (54 of this phase's new tests live here):

- **`risk-reward.ts`** (`computeRiskReward`): stop distance and, per
  take-profit target, reward distance and risk/reward ratio. Distances are
  always magnitudes; direction is used only to *warn* (never block) when a
  stop or target sits on the wrong side of entry — a user mid-edit has a
  right to see that without the tool refusing to compute anything.
- **`risk-calculator.ts`** (`calculateRisk`): dollar risk, stop distance,
  reward and risk/reward ratio are always computable from account
  balance/risk %/entry/stop/target alone. Position size is the one figure
  that additionally needs a real contract specification — a "$ per point
  per unit" value. This app only asserts that value (as `1`) for market
  types it tracks as direct, USD-quoted spot instruments (crypto, the
  forex pairs it tracks, stocks); for metals and indices — where a real
  contract (e.g. a 100oz gold future, a broker-specific index CFD
  multiplier) is needed and this app has no source for one — position size
  is left `null` with an explicit `positionSizeUnavailableReason` rather
  than guessed. Extending `DIRECT_UNIT_VALUE_MARKET_TYPES` is a one-line
  change *only* once a real per-instrument contract spec is sourced —
  never as a blanket per-market-type assumption.
- **`trade-pnl.ts`** (`computeTradePnl`): realized P/L for a closed trade
  journal entry, net of fees in cents plus a gross return percent.
- **`performance.ts`** (`computePerformanceStats`): win rate, average
  win/loss, profit factor, average R, max drawdown and the equity curve,
  computed only from CLOSED trades with a realized P/L. Nothing here is
  ever estimated: profit factor is `null` (not `Infinity`) when there are
  no losing trades to normalize against, and average R only ever averages
  over trades that recorded a risk amount — a trade logged without one is
  excluded from that average, not assumed to carry some default risk.

**Setups** (`lib/actions/setups.ts`, `/dashboard/setups`) extend the
`trading_setups` table from Phase 1 — RLS was already correct
(owner-private, with a `user_id is null` carve-out for a future shared
AI/system feed that this phase never populates, since every setup created
here has `source: 'user'`). Phase 7's migration adds `setup_quality` and
`invalidation` columns and two new terminal `setup_status` values
(`completed`, `invalidated`) alongside the existing
active/triggered/expired. `checkUsageLimit(userId, "saved_setups")` — a
limit key Phase 3 already defined — gates creation the same way every
other capacity limit in this app does.

**Trade journal** (`lib/actions/journal.ts`, `/dashboard/journal`) also
extends its Phase 1 table: `risk_amount_cents`, `strategy`, and
`screenshot_url` columns. Logging a trade with an exit price, or closing
an open one later via `closeJournalEntryAction`, now actually computes and
stores `pnl_cents`/`pnl_percent` via `trade-pnl.ts` — previously the
column existed but nothing ever wrote to it. "Result" (win/loss/breakeven)
is deliberately not a stored column; it's derived from `pnl_cents` at
render time, so it can never drift out of sync with the P/L that produced
it.

**Performance** (`/dashboard/performance`) reads closed journal entries
server-side, runs them through `computePerformanceStats`, and renders stat
tiles plus an equity-curve chart (`components/dashboard/equity-curve-chart.tsx`,
recharts — installed since Phase 1 scaffolding but unused until now). The
page states outright that past performance doesn't guarantee future
results, consistent with the risk disclaimers everywhere else in the app.

## 6. Security architecture

- **RLS everywhere.** Every table has RLS enabled; policies are additive
  (deny-by-default). See the bottom of `0001_init.sql` for the full policy
  set. A `public.is_admin()` `security definer` function centralizes the
  admin check so it can't be bypassed by disabling client-side checks.
- **Admin protection is never UI-only.** Hiding admin nav items is a UX
  nicety, not a security boundary — `requireAdmin()` re-checks on every
  admin page load, and RLS re-checks on every query.
- **Input validation** with Zod on every Server Action, at the boundary
  where untrusted input enters the system.
- **Rate limiting architecture**: `lib/rate-limit.ts` implements an
  in-memory sliding-window limiter, applied to login/register/forgot-password
  today. It's explicitly documented as process-local and not
  production-ready for a multi-instance deployment — swapping in
  `@upstash/ratelimit` (or similar shared-store limiter) is a drop-in
  replacement using the same `key` scheme.
- **Secrets**: all API keys live in environment variables (see
  [Environment variables](#10-required-environment-variables)); none are
  ever committed, logged, or sent to the browser. `NEXT_PUBLIC_*` is used
  only for values that are genuinely safe to expose (Supabase URL/anon key,
  which are meaningless without RLS — which is enabled).
- **Safe error messages**: auth actions return generic messages ("Invalid
  email or password", "If an account exists...") that don't leak whether an
  account exists, consistent with OWASP guidance on authentication
  enumeration.
- **Audit logging**: `audit_logs` records sensitive actions (currently: role
  changes) with actor, action, entity and metadata. Extending this to plan
  edits and subscription overrides is mechanical once those features ship.
- **Injection**: all queries go through the Supabase client's parameterized
  query builder — no raw SQL string concatenation anywhere in application
  code.

## 7. Component architecture

- **shadcn/ui** (Base UI-based, not Radix) provides low-level primitives in
  `components/ui/`. Note: this variant uses a `render` prop for
  polymorphism (`<Button render={<Link href="/x" />} nativeButton={false} />`)
  rather than Radix's `asChild`.
- **Design tokens** live entirely in `src/app/globals.css` as CSS custom
  properties (`--background`, `--primary`, `--success`, `--danger`, ...),
  mapped into Tailwind via `@theme inline`. The product is **dark-first**:
  `<html>` always carries the `dark` class in Phase 1 (no toggle yet), and
  the light palette is kept ready for when one is added.
  - Accent: a single restrained green (`--primary`/`--success`) for
    positive/BUY state; `--danger` (red) is reserved strictly for
    SELL/destructive state, per the "clear BUY/SELL hierarchy without
    excessive colors" requirement.
- **Shared shell components** (`components/shared/`) — `AppSidebar`,
  `AppTopbar`, `MobileNavSheet`, `PageHeader`, `EmptyState` — are used by
  *both* the dashboard and admin shells, configured via a `NavItem[]` array
  (`lib/config/nav.ts`) rather than duplicated markup.
- **Empty/loading states**: every data-backed page handles the zero-rows
  case explicitly via `EmptyState`; feature areas not yet built (Charts,
  Scanner, AI Analysis, Setups, Performance) use `ComingSoonPage`, which is
  honest about what phase ships them rather than faking data.

## 8. Development phases

1. **Phase 1 — Foundation** *(this repo)*: architecture, database schema +
   RLS, auth, landing page, dashboard & admin shells, watchlists, trade
   journal, risk calculator, settings, subscription display (read-only).
2. **Phase 2 — Market data & charts**: live market data integration,
   TradingView Lightweight Charts on the Charts page.
3. **Phase 3 — Scanner & AI analysis**: technical scanner, Claude API
   integration for AI Analysis, `ai_analyses` logging in production use.
4. **Phase 4 — Trading setups & alerts**: AI/user-generated setups with
   entry/stop/take-profit, alert delivery.
5. **Phase 5 — Performance analytics**: win rate, average R, drawdown,
   computed from `trade_journal`.
6. **Phase 6 — Subscriptions & payments**: Stripe integration, billing
   history, plan upgrades/downgrades.
7. **Phase 7 — Admin depth**: in-app plan editing, user suspension actions,
   fuller usage/AI dashboards.
8. **Phase 8 — Notifications & polish**: alert delivery channels (email/push),
   accessibility/performance pass, launch prep.

## 9. Required environment variables

See [`.env.example`](../.env.example) for the authoritative list with
comments. Summary:

| Variable | Required in Phase 1 | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public, safe under RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Server-only, admin features |
| `NEXT_PUBLIC_SITE_URL` | Yes | Auth email redirects |
| `ANTHROPIC_API_KEY` | Required for AI Analysis (Phase 6) | Server-only |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | No (later phase) | Server-only |
| `MARKET_DATA_API_KEY` | No (Phase 2) | Server-only |

## 10. Potential technical risks

- **Hand-written database types.** `types/database.ts` mirrors the SQL
  migration by hand rather than via `supabase gen types`. This is
  intentional for Phase 1 (no live project to generate against yet) but
  creates drift risk — regenerate from the real Supabase project as soon as
  one exists, and treat the migration file as the source of truth in the
  meantime.
- **In-memory rate limiting** doesn't coordinate across serverless
  instances — acceptable for early development, a real risk once deployed
  behind multiple concurrent instances. Documented in `lib/rate-limit.ts`.
- **Service-role key blast radius.** `createServiceRoleClient()` bypasses
  RLS entirely; every call site must be audited to stay server-only. It's
  currently used in exactly one place (admin user email lookup).
- **AI cost/abuse risk (Phase 6).** `checkDailyUsageLimit(userId,
  "ai_analyses_per_day")` gates every request server-side before
  `runAnalysis()` is ever called (`app/api/ai-analysis/route.ts`), backed
  by `plans.limits.ai_analyses_per_day` and `usage_tracking` — never just
  a disabled button in the UI. The in-memory per-symbol/timeframe cache in
  `lib/ai/analyze.ts` further bounds real Claude spend during a burst of
  requests for the same hot symbol, but — like `lib/rate-limit.ts` — is
  per-process and doesn't coordinate across serverless instances; revisit
  with a shared store (Redis or similar) before scaling out.
- **Market data licensing/cost.** No provider is chosen yet; the schema and
  UI are deliberately provider-agnostic so this can be decided in Phase 2
  without a schema migration.
- **Scanner fetch fan-out (Phase 5).** `runScan()` fetches OHLCV for each
  matching asset sequentially, not in parallel, to stay under the
  provider's rate limits with today's small asset list. This will need to
  become a bounded-concurrency batch (or a cached/precomputed snapshot
  table) once the tracked-asset count grows enough for sequential fetches
  to make a scan noticeably slow.
