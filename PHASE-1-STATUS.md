# Phase 1 Status — Foundation

Status: **Complete**. Typecheck, lint, unit tests, Playwright end-to-end
tests, and a production build all pass with zero errors and zero warnings
as of this writing.

## Scope delivered

- **Project foundation** — Next.js 16 (App Router, TypeScript, Tailwind
  CSS v4), layered `services` / `lib/actions` / `lib/validation` /
  `components` architecture.
- **Database** — PostgreSQL + Prisma 7. `User`, `Role`, `Permission`,
  `RolePermission`, `GoldRate`, `SystemSetting`, `AuditLog`. See
  `DATABASE.md`.
- **Authentication** — bcrypt password hashing, stateless JWT sessions
  (`jose`), `httpOnly`/`secure`/`sameSite=lax` cookies, a centralized Data
  Access Layer (`src/lib/auth/dal.ts`) for every authorization check,
  `proxy.ts` for optimistic route protection. See `ARCHITECTURE.md`.
- **Authorization** — database-backed RBAC (`Role` → `RolePermission` →
  `Permission`), seeded `OWNER` (full access, hardcoded bypass) and `ADMIN`
  (fully data-driven permission grants — configurable without a code
  change).
- **Application shell** — luxury black/gold design system
  (`src/app/globals.css` design tokens), responsive sidebar + topbar +
  mobile nav drawer, every module from the long-term vision represented in
  navigation, with unimplemented modules rendering an honest "Coming in
  next phase" page (no fake data, no fake functionality).
- **Daily Gold Rate System** — blocking entry modal for owners/admins on a
  new business day, append-only rate history (never overwrites), filterable
  history page. See `GOLD-RATE-ENGINE.md`.
- **Jewelry Weight Calculation Engine** — pure `decimal.js`-based service,
  percentage and fixed-gram wastage, three pricing modes, no premature
  rounding, a reusable calculator UI backed by a Server Action so every
  displayed figure is server-verified. See `GOLD-RATE-ENGINE.md`.
- **Dashboard** — real today's-gold-rate data, real system status checks
  (DB connectivity, auth, calculation engine — actually executed, not
  hardcoded), honestly-labeled placeholder cards for every future metric.
- **Tests** — 37 Vitest unit tests (calculation engine, formatting,
  business-date normalization) + 3 Playwright end-to-end tests exercising
  the real browser against the real app and a real Postgres database
  (unauthenticated redirect, full login → gold-rate-gate → dashboard →
  calculator → history → logout flow, invalid-credentials handling).
- **Documentation** — this file plus `README.md`, `ARCHITECTURE.md`,
  `DATABASE.md`, `GOLD-RATE-ENGINE.md`.

## Technology stack

Next.js 16.3.1 (Turbopack) · React 19.2 · TypeScript 5 (strict) · Tailwind
CSS v4 · Prisma 7.9 + `@prisma/adapter-pg` · PostgreSQL 16 · Zod 4 ·
`decimal.js` · `jose` · `bcryptjs` · Radix UI primitives ·
`class-variance-authority` · `sonner` (toasts) · Vitest 4 · Playwright.

## Database tables

`users`, `roles`, `permissions`, `role_permissions`, `gold_rates`,
`system_settings`, `audit_logs` — see `DATABASE.md` for full column-level
detail and rationale.

## Authentication status

Working end-to-end: sign in, session persists across requests (12-hour
JWT), protected routes redirect to `/login` when unauthenticated,
`/login` redirects to `/dashboard` when already authenticated, sign out
clears the session and re-protects every route, invalid credentials show a
generic error (no user-enumeration signal) and are recorded as
`LOGIN_FAILED` in the audit log. Verified by both the Playwright suite and
manual browser testing (screenshots taken during this build).

## Gold rate system status

Working end-to-end: the gate modal appears exactly when today's rate is
missing and the user can set it, disappears permanently for that business
day once saved, the dashboard and calculator immediately reflect the new
rate, and the history page correctly lists the entry with date, all four
purities, creator, and timestamp. Verified via the Playwright suite
(fills the real form, submits the real Server Action, reloads to confirm
the gate doesn't reappear) and by direct inspection of the resulting rows
in Postgres (one immutable row per purity, no duplicates from a debounced
double-submit).

## Calculation engine status

37 unit tests passing, including the three worked examples from the spec
(`Net=10, Wastage=5%, Rate=40000 → Gross=10.5, Value=420000`, etc.), all
required edge cases (zero/negative/missing values, invalid wastage, very
small and very large weights, decimal precision, the classic
floating-point drift case), and all three pricing modes.

## Tests passed

```
Vitest:      37 passed, 0 failed  (3 files: gold-calculation, format, business-date)
Playwright:   3 passed, 0 failed  (real browser, real Postgres)
TypeScript:   0 errors  (tsc --noEmit)
ESLint:       0 errors, 0 warnings
```

## Build status

`npm run build` succeeds cleanly (Turbopack production build). `npm run
start` was smoke-tested against the production build and correctly
enforces route protection.

## Known limitations

- Business date uses the server's local calendar day; no per-store
  timezone setting yet.
- No password reset flow or MFA.
- Only `OWNER` and `ADMIN` roles are seeded. The additional roles from the
  long-term vision (`MANAGER`, `CASHIER`, `SALESPERSON`,
  `INVENTORY_MANAGER`, `ACCOUNTANT`, `MARKETING_MANAGER`) are supported by
  the schema and authorization model but have no seed data or
  role-management UI yet — that's explicitly future scope (module #29,
  "Role-Based Permissions", in the long-term vision).
- Every module besides Dashboard and Settings is an honest placeholder —
  by design for Phase 1, not a bug.

## Exact command to run the application

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Then open `http://localhost:3000` and sign in with the credentials printed
by `npm run db:seed`.

## Recommendation for Phase 2

Build **Inventory**, the **ZJ Barcode System**, **POS**, and **Sales** as
one connected phase — in that order. Inventory establishes the item model
(net weight, purity, wastage config) that the barcode system labels, POS
consumes at the counter, and Sales persists as a transaction. All four
modules are the direct downstream consumers of the Gold Rate System and
Calculation Engine built in Phase 1, so building them next gets the
foundation into real use fastest and validates that the Phase 1 primitives
(the calculation engine's pricing modes, the append-only rate history) hold
up under real transactional load before Customer CRM, Karigar Management,
and the AI/marketing modules are layered on top.
