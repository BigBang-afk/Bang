# Zarghoon Jewellers ERP — Backend (Phase 1: Identity & Access)

Modular-monolith API for the Zarghoon ERP. This phase implements only the
**Identity & Access** module — see `/ARCHITECTURE.md` at the repo root for
the full system design and how later modules build on this foundation.

## Stack

NestJS (TypeScript) · PostgreSQL (schema-per-module) + Prisma · Redis
(rate-limit storage) · JWT access tokens + rotating refresh-token sessions ·
bcrypt · TOTP MFA (otplib) · CSRF double-submit cookie.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+

## Run it locally

```bash
cd backend
cp .env.example .env        # then edit DATABASE_URL / REDIS_URL / secrets as needed
npm install
npx prisma migrate deploy   # applies the identity + audit schema
npm run prisma:seed         # permission catalog, OWNER/BRANCH_MANAGER/CASHIER/
                             # KARIGAR_COORDINATOR/ACCOUNTANT/MARKETING roles,
                             # a default "Main Branch", and the bootstrap
                             # OWNER account (from SEED_OWNER_* in .env —
                             # never hard-coded)
npm run start:dev
```

The API listens on `http://localhost:3000`, mounted under `/api/v1`. Pair it
with the frontend in `../frontend` (`npm run dev`, defaults to
`http://localhost:5173`).

Sign in with the bootstrap owner (`SEED_OWNER_USERNAME` / `SEED_OWNER_PASSWORD`,
defaults to `owner` / `ChangeMe123!`) and change the password immediately via
the Security page.

## Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm run lint         # eslint --max-warnings=0
npm test             # unit tests (Jest)
npm run test:e2e     # e2e tests against a real Postgres + Redis (uses .env.test)
npm run build         # nest build -> dist/
```

`test:e2e` expects `DATABASE_URL`/`REDIS_URL` in `.env.test` to point at
real, disposable instances — it runs `prisma migrate deploy` against the
test database via a Jest global setup, then exercises the full HTTP API
with supertest (including a dedicated rate-limiting test that boots its own
app instance with throttling force-enabled).

## How authentication works

- `POST /api/v1/auth/login` — `{ identifier, password, totpCode? }`, where
  `identifier` is whatever the account was set up with (username, email, or
  phone). Returns a short-lived JWT access token in the body plus an
  httpOnly, rotating refresh-token cookie ("session") and a CSRF cookie.
- `POST /api/v1/auth/refresh` — silently mints a new access token from the
  refresh cookie; requires the CSRF cookie's value echoed back as an
  `X-CSRF-Token` header. Refresh tokens rotate on every use; presenting an
  already-used one is treated as theft and revokes every session for that
  user.
- `POST /api/v1/auth/logout` — revokes the current session (also
  CSRF-protected).
- `POST /api/v1/auth/change-password` / `PATCH /api/v1/users/me/password` —
  same operation, two documented paths; revokes every other active session.
- `POST /api/v1/auth/forgot-password` is `POST /api/v1/auth/password-reset/request`
  in this implementation, and never reveals whether the identifier matches
  an account. `POST /api/v1/auth/reset-password` is
  `/auth/password-reset/confirm`.
- Failed logins increment a per-account counter; hitting
  `MAX_FAILED_LOGIN_ATTEMPTS` sets a temporary `lockedUntil` (separate from
  the admin-settable `LOCKED` status — both block login).
- MFA is TOTP-based and opt-in per account: `/auth/mfa/enroll` returns a QR
  code, `/auth/mfa/enroll/confirm` activates it, `/auth/mfa/disable` turns
  it off — all require a valid current code.

## How RBAC works

- `User —(UserRole)→ Role —(RolePermission)→ Permission`. A user can hold
  multiple roles; their access token embeds the union of every permission
  code across those roles.
- Authorization is **never** decided by role name — only by permission
  code — so `PermissionsGuard` + `@RequirePermissions(...)` is the only
  authorization mechanism in the app, and it's the same one every future
  module will use.
- Six roles ship seeded: `OWNER`, `BRANCH_MANAGER`, `CASHIER`,
  `KARIGAR_COORDINATOR`, `ACCOUNTANT`, `MARKETING` (see `prisma/seed.ts` for
  their exact permission sets). They're marked `isSystem` — undeletable, and
  their permission sets are immutable through the API — new custom roles
  can be created and edited freely by anyone holding `roles.manage`.
- Privilege-escalation guards: assigning a role requires `roles.manage`
  (not just `users.update`), and nobody — including OWNER — can assign
  roles to their own account via the API.
- The permission catalog (`src/modules/identity-access/permissions.constants.ts`)
  already includes codes for modules that don't exist yet (`products.*`,
  `inventory.*`, `sales.*`, `customers.*`, `finance.*`, `marketing.*`,
  `reports.read`) so roles can be modeled realistically today; only the
  `identity`-module codes are actually enforced by a guard right now.

## Branch access foundation

`User.branchAccessType` is `SINGLE` / `MULTIPLE` / `ALL`; `UserBranch` rows
record the explicit grants for `SINGLE`/`MULTIPLE` (`ALL` bypasses the join
entirely — used by OWNER). `GET /api/v1/branches` is available to any
authenticated user (reference data for pickers); creating branches requires
`branches.manage`. The full Branch/Warehouse module is a later phase — this
is just enough of a `Branch` entity for identity to attach access to.

## Database

Two Postgres schemas: `identity` (`users`, `roles`, `permissions`,
`user_roles`, `role_permissions`, `branches`, `user_branches`, `sessions`,
`password_reset_tokens`) and `audit` (`audit_logs`). Every table has UUID
primary keys, foreign keys with cascade/set-null as appropriate, unique
constraints on the identifier columns, and `createdAt`/`updatedAt`
timestamps.

## What's intentionally not here yet

Product Master, Gold Rates, Pricing Engine, Inventory, POS, Sales,
Purchases, Customers, CRM, Karigar, Old Gold/Exchange, Finance, Marketing,
Website, AI — see `/ARCHITECTURE.md` for the phase plan. This phase only
builds the identity/RBAC/branch/audit foundation those modules will depend
on.
