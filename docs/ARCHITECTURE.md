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
that aren't a form submission: OAuth/email-confirmation callbacks, and (in
later phases) webhooks from Stripe and any market-data provider, plus any
endpoint that needs to be called from outside the Next.js app itself.

Every Server Action:

1. Re-authenticates via `requireUser()`/`requireAdmin()` — never trusts the
   client.
2. Validates input with Zod before touching the database.
3. Lets Supabase RLS make the final authorization call on the write itself.

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
| `ANTHROPIC_API_KEY` | No (Phase 3) | Server-only |
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
- **AI cost/abuse risk (Phase 3+).** Once the Claude API is wired up,
  per-user rate limits (backed by `plans.limits.ai_analyses_per_day` and
  `usage_tracking`) must be enforced server-side before each call, not just
  displayed in the UI.
- **Market data licensing/cost.** No provider is chosen yet; the schema and
  UI are deliberately provider-agnostic so this can be decided in Phase 2
  without a schema migration.
