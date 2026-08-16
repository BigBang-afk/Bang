# Bang — Identity & Access (Phase 1)

Modular-monolith backend for the Bang jewelry platform. This phase implements
only the **Identity & Access** module — see `/ARCHITECTURE.md` at the repo
root for the full system design and how later modules build on this
foundation.

## Stack

NestJS (TypeScript) · PostgreSQL + Prisma · JWT access tokens + rotating
refresh tokens · bcrypt · TOTP MFA (otplib) · static Luxury Gold + Black UI.

## Prerequisites

- Node.js 20+
- A running PostgreSQL 14+ instance

## Run it locally

```bash
cd backend
cp .env.example .env        # then edit DATABASE_URL / secrets as needed
npm install
npx prisma migrate deploy   # applies the identity-access schema
npm run prisma:seed         # creates permissions, OWNER/ADMIN/STAFF roles,
                             # and a bootstrap owner account
                             # (SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD in .env)
npm run start:dev
```

The API listens on `http://localhost:3000` (`PORT` in `.env`), mounted under
`/api`. The static UI is served from the same origin at `/` (redirects to
`/login.html` or `/dashboard.html` depending on session state).

Sign in with the bootstrap owner account printed by the seed script
(`SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD`, defaults to
`owner@bang.local` / `ChangeMe123!`) and change the password on first login
via the Security page.

## Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint --max-warnings=0
npm test             # unit tests (Jest)
npm run test:e2e     # e2e tests against a real Postgres DB (uses .env.test)
npm run build         # nest build -> dist/
```

`test:e2e` expects `DATABASE_URL` in `.env.test` to point at a real,
disposable Postgres database (it runs `prisma migrate deploy` against it via
a Jest global setup, then exercises the full HTTP API with supertest).

## What's implemented

- User / Role / Permission / UserRole / RolePermission schema, namespaced
  permission codes (`identity-access.*`).
- Login, logout, silent refresh (rotating opaque refresh token in an
  httpOnly cookie, reuse detection revokes the whole session family),
  password reset (request/confirm), account lockout after repeated failed
  logins.
- TOTP-based MFA: enroll (QR code), confirm, required-on-login, disable.
- `JwtAuthGuard` (global, `@Public()` opt-out) + `PermissionsGuard`
  (`@RequirePermissions(...)`) enforcing RBAC on every route.
- Append-only `AuditLog` written by every auth/user/role mutation, exposed
  read-only via `/api/audit-logs`.
- User management (create/update/deactivate/assign roles), role management
  (create/update/delete with permission sets), `/api/permissions` listing.
- Static Luxury Gold + Black UI: login, password reset, MFA setup, a
  dashboard placeholder, and a Users & Roles / Audit Log admin console.

## What's intentionally not here yet

POS, inventory, sales, CRM, marketing, and the owner executive dashboard —
see `/ARCHITECTURE.md` for the phase plan. This phase only builds the
identity/RBAC/audit foundation those modules will depend on.
