# Lumenex

AI-powered trading analytics platform — decision-support for crypto, forex,
gold and index traders. Built with Next.js, TypeScript, Tailwind, shadcn/ui
and Supabase.

**This repository is currently at the end of Phase 1 (Architecture &
Foundation).** See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the
full architecture writeup, and the [Phase 1 summary](#phase-1-summary) below
for what's built vs. what's next.

## Getting started

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in at minimum `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project's
**Settings → API** page. See `.env.example` for the full list and what each
variable unlocks.

### 4. Set up the database

Run the migration against your Supabase project — either via the SQL editor
in the Supabase dashboard (paste the contents of
`supabase/migrations/0001_init.sql`), or with the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This creates the full schema, RLS policies, and seeds the four pricing
plans plus a handful of reference market assets.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Register an account —
you'll land in the dashboard on the Free plan automatically. To reach the
admin dashboard, promote your user in SQL:

```sql
update public.profiles set role_id = 3 where id = '<your-user-id>'; -- superadmin
```

## Project structure

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#2-folder-structure) for
the annotated folder layout.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also runs the TypeScript check) |
| `npm run start` | Run a production build |
| `npm run lint` | ESLint |

## Phase 1 summary

### What was built

- **Architecture & docs**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
  covering data, auth, API, security, component and phase architecture.
- **Database**: full normalized Postgres schema
  (`supabase/migrations/0001_init.sql`) — 15 tables, RLS on every table,
  triggers, indexes, seeded plans and market assets.
- **Auth**: Supabase Auth (email/password) with login, register,
  forgot-password flows; session refresh + route protection via middleware;
  server-side `requireUser`/`requireAdmin` guards.
- **Landing page**: hero, product explanation, features, how it works,
  dashboard preview, supported markets, pricing (from the database), FAQ,
  risk disclaimer, CTA, footer. Fully responsive, dark-first fintech theme.
- **Dashboard shell**: sidebar + topbar + mobile nav, all 12 nav sections
  wired up. Functional: Overview (live counts), Markets (browse seeded
  assets), Watchlist (create/add/remove, real DB writes), Trade Journal
  (log/list/delete trades), Risk Calculator (fully client-side), Settings
  (profile editing), Subscription (shows current plan). Honest "coming
  soon" states for Charts/Scanner/AI Analysis/Setups/Performance, each
  labeled with the phase that ships it.
- **Admin dashboard shell**: role-protected (defense in depth: middleware +
  layout guard + RLS), all 10 nav sections wired up with real queries —
  Overview, Users (with role management, superadmin-only, audit-logged),
  Subscriptions, Plans (read-only), Usage Stats, System Status (env-var
  based, honest about what's not connected), AI Usage, Market Data, Audit
  Logs, Settings.

### Files created/modified

Everything under `src/`, `supabase/`, `docs/`, plus root config
(`package.json`, `components.json`, `.env.example`). The pre-existing
`SupportResistance_VolumeSignals.pine` file was moved to
`resources/pine-scripts/` to keep the repo root clean for the app.

### Environment variables required

See [`.env.example`](.env.example). For Phase 1: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`. Recommended:
`SUPABASE_SERVICE_ROLE_KEY` (unlocks user emails on the admin Users page —
without it, the page still works, just without emails).

### How to test it

1. `npm run build` — verifies the full app type-checks and builds
   (all 27 routes compile cleanly as of this phase).
2. With Supabase configured: register an account, confirm the dashboard
   loads with live (zero) counts, create a watchlist and add an asset, log
   a trade in the journal, run the risk calculator, edit your profile in
   Settings. Promote yourself to admin via SQL and confirm `/admin` loads
   and a non-admin is redirected away from it.
3. Without Supabase configured: the marketing pages (`/`, `/pricing`) and
   auth pages still render, using a documented static fallback for pricing
   data — see `lib/plans.ts`.

### Known limitations

- No live market data, charts, AI analysis, alerts or payments yet — all
  explicitly out of scope for Phase 1 and labeled as such in the UI.
- `types/database.ts` is hand-written, not generated from a live Supabase
  project (none existed at the time this phase was built). Regenerate once
  a project is provisioned.
- Admin plan editing is read-only in Phase 1; use the Supabase dashboard/SQL
  to adjust pricing until in-app editing ships.
- Rate limiting is in-memory and single-instance only (documented in
  `lib/rate-limit.ts`) — fine for development, needs a shared store (e.g.
  Upstash) before a multi-instance production deployment.

### Next phase

**Phase 2 — Market data & charts.** Start it by telling me **"START PHASE
2"**.
