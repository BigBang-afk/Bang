# Architecture

## Guiding principle: layered, not tangled

```
UI (Server/Client Components)
   -> Server Actions / Route Handlers   (validation, auth, orchestration)
      -> Services                        (business logic, pure where possible)
         -> Repositories / Prisma          (data access)
```

Nothing above the Services layer contains business rules. A React component
never computes a gold value, checks a permission by string-matching a role
name, or writes to Postgres directly. This is what makes the codebase safe
to extend into a multi-tenant SaaS product later: the business logic doesn't
know it's running inside a jewelry store's Next.js app — it just takes
inputs and returns results.

## Folder-by-folder

### `src/services/`

Framework-agnostic business logic. No `next/*` imports, no React, no HTTP.
Each service owns one concern:

- `gold-calculation.service.ts` — the jewelry weight/pricing engine (see
  `GOLD-RATE-ENGINE.md`). Pure functions, `decimal.js` math, throws a typed
  `GoldCalculationError` on invalid input. Safe to unit test with zero
  mocking, and safe to import from both server and client code (it never
  touches the database).
- `gold-rate.service.ts` — daily gold rate persistence and the
  "effective rate per day" read model. Talks to Prisma.
- `system-setting.service.ts` — key/value business settings.
- `audit.service.ts` — writes to the append-only audit log.

### `src/lib/auth/`

Everything authentication/authorization related, centralized so no other
part of the app hand-rolls a permission check:

- `password.ts` — bcrypt hashing (12 rounds).
- `session.ts` — signs/verifies a stateless JWT session (via `jose`) and
  manages the `httpOnly`, `secure`, `sameSite=lax` session cookie.
- `dal.ts` — the **Data Access Layer**. `verifySession()`, `getCurrentUser()`,
  `requireUser()`, `requirePermission()`, `userHasPermission()`,
  `assertPermission()`. Every page, Server Action, and data-fetching
  function that needs "who is logged in" or "are they allowed to do X" goes
  through this file. Each function is memoized per request with React's
  `cache()`, so calling `requireUser()` in a layout and again in a page
  costs one database round trip, not two.
- `permissions.ts` — the single source of truth for permission keys
  (`PERMISSIONS.GOLD_RATE_CREATE`, etc.) and the `AuthorizationError` type.
- `actions.ts` — `login` / `logout` Server Actions.

This follows the pattern Next.js's own authentication guide recommends: a
`proxy.ts` (formerly "middleware") does a cheap, cookie-only *optimistic*
redirect for unauthenticated users, but the actual authorization decision is
always re-checked in the DAL, close to the data. Proxy is a UX
optimization, never the security boundary.

### `src/proxy.ts`

Next.js 16 renamed Middleware to Proxy. Ours reads the session cookie (no
database call — see above) and redirects unauthenticated requests to
`/login` and authenticated requests away from `/login`. It runs on every
route except static assets and API routes.

### `src/lib/actions/`

Server Actions — the mutation entry points. Each one:

1. Resolves the current user via the DAL.
2. Checks the specific permission it needs via `assertPermission`.
3. Validates input with a Zod schema.
4. Calls a service function.
5. Writes an audit log entry when the action changes state.
6. Revalidates the relevant paths.

### `src/lib/validation/`

Zod schemas, one file per feature. Shared between client-visible field
errors and server-side enforcement — the server never trusts a value just
because the client-side form already validated it.

### `src/components/`

- `ui/` — small, unstyled-opinion primitives (Button, Input, Card, Dialog,
  Select, Table, ...) built on Radix UI + `class-variance-authority`. This
  is the shadcn/ui pattern, hand-adapted to the Zarghoon gold/black tokens
  defined in `src/app/globals.css` rather than pulled in via the shadcn CLI.
- `layout/` — the application shell: `Sidebar`, `Topbar`, `MobileNav`,
  `ComingSoon`.
- `gold-rate/`, `calculator/`, `dashboard/`, `auth/` — feature components.
  These call Server Actions and services but contain no business math
  themselves.

### `src/app/`

- `login/` — public.
- `(app)/` — a route group (doesn't affect the URL) whose `layout.tsx` is
  the single place that (a) requires a session, (b) checks whether today's
  gold rate has been entered, and (c) renders the sidebar/topbar shell
  around every authenticated page.

## Authentication design

Stateless JWT sessions, following the pattern in the Next.js docs
(`docs/app/guides/authentication`):

1. `login` Server Action verifies credentials with bcrypt, then calls
   `createSession(userId, roleName)`.
2. `createSession` signs a JWT (`{ userId, roleName, expiresAt }`, HS256,
   12-hour expiry) with `AUTH_SECRET` and sets it as an `httpOnly`,
   `sameSite=lax` cookie (`secure` in production).
3. Every request that needs identity calls `verifySession()` /
   `getCurrentUser()` from the DAL, which decrypts the cookie and — for
   `getCurrentUser()` — loads the live user + role from Postgres (so a
   deactivated user is locked out immediately, not just after their JWT
   expires).
4. `logout` deletes the cookie and writes an audit log entry.

The JWT payload intentionally carries only `userId` and `roleName` — no
email, no permissions list — so it can't leak sensitive data and can't go
stale in a way that grants extra access (permissions are always re-read
from the database, never trusted from the token).

## Authorization design

Role-Based Access Control, stored in the database (`Role`, `Permission`,
`RolePermission`), not hardcoded:

- `OWNER` bypasses all permission checks (full access, by design).
- Every other role — starting with `ADMIN` — is granted a set of
  permission keys via `RolePermission` rows. The seed script grants `ADMIN`
  every permission that exists today, but because the grant is data, an
  owner can later revoke individual permissions from `ADMIN` (or from a
  future `MANAGER`/`CASHIER`/etc. role) without a code change once a
  role-management UI ships.
- Permission keys are namespaced strings (`gold_rate:create`,
  `settings:manage`, ...) declared once in `PERMISSIONS`
  (`src/lib/auth/permissions.ts`) and seeded into the `permissions` table.
  No component or action ever checks a raw string like `role === "ADMIN"`.

## Precision & money handling

- All weight and money arithmetic uses `decimal.js` — never native
  JavaScript floats. `tests/gold-calculation.service.test.ts` includes an
  explicit regression test for the classic `0.1 + 0.2` float-precision
  failure mode.
- Postgres columns for money use `Decimal(14, 2)` (`gold_rates.ratePerGram`),
  never `float`/`double precision`.
- The calculation engine does not round its results — `calculateGoldValue`
  returns full-precision `Decimal` values. Rounding only happens at display
  time, in `src/lib/format.ts` (`formatWeight` → 3dp, `formatCurrency` →
  2dp), so a value that will later be persisted (e.g. in a Phase 2 sale)
  is never silently truncated before it's stored.

## Why a Server Action recomputes the calculator on every change

`GoldCalculator` calls the `calculateGoldValueAction` Server Action (not the
service directly) on every input change, debounced by ~200ms. This means
the number a salesperson sees on screen is always the server's answer, not
a client-side computation the browser could be tricked into faking — the
same engine that will compute a real invoice total in Phase 2 already runs
server-side today.
