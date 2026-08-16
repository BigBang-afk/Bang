# Zarghoon Jewellers — AI Business OS

A production-grade jewelry ERP + POS + CRM + AI marketing platform, built
phase by phase. This is **Phase 1: Foundation** — project scaffolding,
authentication, the database, the application shell, the daily gold rate
system, and the jewelry weight calculation engine.

See [`PHASE-1-STATUS.md`](./PHASE-1-STATUS.md) for exactly what is and isn't
built yet, [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the codebase is
organized, [`DATABASE.md`](./DATABASE.md) for the schema, and
[`GOLD-RATE-ENGINE.md`](./GOLD-RATE-ENGINE.md) for the pricing/weight
formulas.

## Technology stack

- **Framework**: Next.js 16 (App Router, Turbopack, Server Actions)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v4 + a small set of Radix-based UI primitives
- **Database**: PostgreSQL
- **ORM**: Prisma 7 (driver adapter workflow, `@prisma/adapter-pg`)
- **Validation**: Zod
- **Auth**: Custom session auth — bcrypt password hashing, JWT session
  cookies signed with `jose`, a centralized Data Access Layer for
  authorization (see `ARCHITECTURE.md`)
- **Precision math**: `decimal.js` for every weight and money calculation
- **Testing**: Vitest (unit) + Playwright (end-to-end)

## Getting started

### Prerequisites

- Node.js 20.19+ (project developed against Node 22)
- A running PostgreSQL 14+ instance

### Setup

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate        # create the database schema
npm run db:seed           # seed roles, permissions, and the default owner
npm run dev                # http://localhost:3000
```

The seed script prints a default OWNER login (email + password) to the
console — change that password before using this anywhere but local
development.

### Environment variables

| Variable       | Description                                                        |
| -------------- | -------------------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string                                        |
| `AUTH_SECRET`  | Secret used to sign session JWTs. Generate with `openssl rand -base64 48` |
| `SEED_OWNER_EMAIL` / `SEED_OWNER_PASSWORD` | Optional — override the seeded owner's credentials |

## Development commands

| Command               | What it does                                   |
| ---------------------- | ----------------------------------------------- |
| `npm run dev`           | Start the dev server (Turbopack)                |
| `npm run build`         | Production build                                |
| `npm run start`         | Run the production build                        |
| `npm run typecheck`     | `tsc --noEmit`                                  |
| `npm run lint`          | ESLint                                          |
| `npm test`              | Run Vitest unit tests once                      |
| `npm run test:watch`    | Vitest in watch mode                            |
| `npm run test:e2e`      | Playwright end-to-end tests                     |
| `npm run db:migrate`    | Create/apply a Prisma migration                 |
| `npm run db:generate`   | Regenerate the Prisma Client                    |
| `npm run db:seed`       | Seed roles, permissions, business settings, owner user |
| `npm run db:studio`     | Open Prisma Studio                              |

## Project structure

```
prisma/                  Schema, migrations, seed script
src/
  app/                    Routes (App Router)
    login/                 Public login page
    (app)/                 Authenticated shell — sidebar/topbar + every module
  components/             UI: primitives, layout, feature components
  services/               Business logic — no React, no HTTP, no Next.js APIs
  lib/
    auth/                   Session, password hashing, DAL, permissions
    validation/             Zod schemas
    actions/                Server Actions
    db/                     Prisma client singleton
  types/                  Shared TypeScript types
  proxy.ts                Optimistic route-protection (Next.js 16 "Proxy")
tests/                    Vitest unit tests
e2e/                      Playwright end-to-end tests
```

## Known limitations (Phase 1)

- Business date for gold rates uses the server's local calendar day — no
  per-store timezone configuration yet.
- No self-service password reset or MFA.
- Only `OWNER` and `ADMIN` roles are seeded; the additional roles named in
  the long-term vision (`MANAGER`, `CASHIER`, etc.) are modeled by the
  schema but not yet exposed in a role-management UI.
- Every module other than Dashboard and Settings renders a "coming in next
  phase" placeholder — no fake data, no fake functionality.

## Next phase

See the end of `PHASE-1-STATUS.md` for the recommended Phase 2 scope
(Inventory, ZJ Barcode System, POS, and Sales — the modules that depend most
directly on the gold rate and calculation engine built in this phase).
