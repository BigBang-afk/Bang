# Zarghoon Jewellers — AI Business OS

A production-grade jewelry ERP + POS + CRM + AI marketing platform, built
phase by phase.

- **Phase 1: Foundation** — project scaffolding, authentication, the
  database, the application shell, the daily gold rate system, and the
  jewelry weight calculation engine.
- **Phase 2: Inventory, Stock & ZJ Barcode System** — full inventory
  management, product categories, atomic barcode generation, stock status
  and movement tracking, and barcode/product label printing.
- **Phase 3: POS + Sales + Invoices + Barcode Checkout** — barcode-scan and
  search-driven point of sale, server-recalculated discounts/tax/payments,
  transactional checkout with concurrency-safe inventory updates, a minimal
  walk-in/existing customer picker, professional printable + real-PDF
  invoices, sales history, and a two-step returns foundation.
- **Phase 4: Customer CRM + Customer Ledger + Customer Intelligence** — a
  full customer profile (contact, personal details, preferences, notes),
  ZJC-numbered customer codes, duplicate-customer protection, an
  append-only financial ledger that's the source of truth for outstanding
  balances, standalone customer payments, rule-based segmentation
  (VIP/inactive/high-value/credit/recent-buyer, all configurable), CSV
  export, and birthday/anniversary reminders.
- **Phase 5: Karigar + Supplier + Gold Ledger + Cash Ledger + Purchase
  Management** — the operational accounting foundation: ZJK/ZJS-numbered
  karigar and supplier profiles, gold given to/received from karigars with
  explicit expected/received/difference wastage reconciliation (never
  silently absorbed), a purity-separated gold ledger shared by karigars and
  suppliers, a karigar/supplier cash ledger (payable/receivable, never a
  single ambiguous balance), supplier purchases with optional
  push-to-inventory, the company-wide physical cash book, and gold/cash
  reconciliation that flags a mismatch but never auto-corrects it.

See [`PHASE-1-STATUS.md`](./PHASE-1-STATUS.md),
[`PHASE-2-STATUS.md`](./PHASE-2-STATUS.md),
[`PHASE-3-STATUS.md`](./PHASE-3-STATUS.md),
[`PHASE-4-STATUS.md`](./PHASE-4-STATUS.md), and
[`PHASE-5-STATUS.md`](./PHASE-5-STATUS.md) for exactly what is and isn't
built, [`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the codebase is
organized, [`DATABASE.md`](./DATABASE.md) for the schema,
[`GOLD-RATE-ENGINE.md`](./GOLD-RATE-ENGINE.md) for the gold pricing/weight
formulas, [`INVENTORY.md`](./INVENTORY.md) for the inventory/stock
architecture, [`BARCODE-SYSTEM.md`](./BARCODE-SYSTEM.md) for the barcode
system, [`POS.md`](./POS.md) for the point-of-sale screen,
[`SALES.md`](./SALES.md) for the sale transaction/payment/returns
architecture, [`INVOICE-SYSTEM.md`](./INVOICE-SYSTEM.md) for invoice
numbering, printing, and PDF generation, [`CUSTOMER-CRM.md`](./CUSTOMER-CRM.md)
for the customer profile/notes/preferences architecture,
[`CUSTOMER-LEDGER.md`](./CUSTOMER-LEDGER.md) for the financial ledger and
payment workflow, [`CUSTOMER-SEGMENTS.md`](./CUSTOMER-SEGMENTS.md) for
the VIP/inactive/segmentation rules, [`KARIGAR-SYSTEM.md`](./KARIGAR-SYSTEM.md)
for karigar management and wastage reconciliation,
[`SUPPLIER-SYSTEM.md`](./SUPPLIER-SYSTEM.md) for supplier management,
[`GOLD-LEDGER.md`](./GOLD-LEDGER.md) for the gold ledger and purity/rate
rules, [`CASH-MANAGEMENT.md`](./CASH-MANAGEMENT.md) for the party cash
ledger and company cash book, [`PURCHASE-SYSTEM.md`](./PURCHASE-SYSTEM.md)
for the purchase workflow, and [`RECONCILIATION.md`](./RECONCILIATION.md)
for the gold/cash reconciliation and adjustment policy.

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
- **Barcodes**: `jsbarcode` (CODE128, rendered client-side as a real
  scannable symbol) — see `BARCODE-SYSTEM.md`
- **PDF generation**: `@react-pdf/renderer` (real, selectable-text PDFs
  rendered server-side, not a screenshot) — see `INVOICE-SYSTEM.md`
- **Testing**: Vitest (unit + integration) + Playwright (end-to-end)

## Getting started

### Prerequisites

- Node.js 20.19+ (project developed against Node 22)
- A running PostgreSQL 14+ instance

### Setup

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:migrate        # create the database schema
npm run db:seed           # seed roles, permissions, categories, and the default owner
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
public/uploads/          Product images (gitignored, created at runtime)
src/
  app/                    Routes (App Router)
    login/                 Public login page
    (app)/                 Authenticated shell — sidebar/topbar + every module
      inventory/            All Stock, Add Stock, item detail/edit, print,
                             Categories, Barcodes, Old Stock, Movements
      pos/                   New Sale, Sales History, Sale Detail, Invoice
                             print, Returns, Invoices
      customers/             All Customers, Add/Edit, Profile (tabs),
                             Ledger, VIP, Inactive, Segments
      karigars/              All Karigars, Add/Edit, Profile (tabs),
                             Ledger, Gold With Karigar, Cash With Karigar
      suppliers/             All Suppliers, Add/Edit, Profile (tabs), Ledger
      purchases/              New Purchase, Purchase History, Purchase Detail
      gold-ledger/            Gold Transactions, Gold With Karigars/Suppliers,
                             Gold Reconciliation
      cash-management/        Cash Transactions, Cash Payable/Receivable,
                             Cash Reconciliation
      party-ledger/           Combined karigar/supplier gold+cash position
                             and the Phase 5 reporting foundation
    api/invoices/[id]/pdf/  Route Handler — real PDF invoice download
  components/             UI: primitives, layout, feature components
  services/               Business logic — no React, no HTTP, no Next.js APIs
  lib/
    auth/                   Session, password hashing, DAL, permissions
    validation/             Zod schemas
    actions/                Server Actions
    db/                     Prisma client singleton
    uploads/                Local product-image storage
  types/                  Shared TypeScript types
  proxy.ts                Optimistic route-protection (Next.js 16 "Proxy")
tests/                    Vitest unit + integration tests
e2e/                      Playwright end-to-end tests
```

## Known limitations

- Business date for gold rates uses the server's local calendar day — no
  per-store timezone configuration yet.
- No self-service password reset or MFA.
- Only `OWNER` and `ADMIN` roles are seeded; the additional roles named in
  the long-term vision (`MANAGER`, `CASHIER`, `SALESPERSON`, `ACCOUNTANT`,
  `MARKETING_MANAGER`, `KARIGAR_MANAGER`, etc.) are modeled by the schema
  and every Phase 4 `customers:*` / Phase 5 `karigars:*`/`suppliers:*`/
  `purchases:*`/`gold_ledger:*`/`cash:*` permission is scoped precisely to
  what the spec describes for each of them, but no role-management UI
  exists yet to actually create those roles and grant the permissions —
  see `CUSTOMER-CRM.md` "Permissions" and `KARIGAR-SYSTEM.md` "Permissions".
- Product images are stored on local disk, not object storage (see
  `INVENTORY.md`).
- No payment gateway integrations — Phase 3 payments are recorded, not
  processed (cash/card/bank transfer/credit are logged as facts, not
  charged through any processor). See `SALES.md`.
- No overpayment/change-due support — payments must sum exactly to the
  grand total.
- WhatsApp sharing is a `wa.me` deep link the staff member sends manually;
  there is no WhatsApp Business API automation yet. See `INVOICE-SYSTEM.md`.
- Returns are not yet wired to the customer ledger — approving a return
  (Phase 3) does not post a `REFUND`/`CREDIT_ADJUSTMENT` entry yet; the
  ledger schema supports it, but the spec explicitly deferred wiring it up
  until a future phase builds the full exchange/refund workflow. See
  `CUSTOMER-LEDGER.md` "Returns integration".
- Birthday/anniversary reminders are dashboard widgets only — no automated
  WhatsApp/SMS sending happens. See `CUSTOMER-CRM.md` "Birthday /
  anniversary".
- CSV import is prepared architecturally (a service-layer function
  signature) but has no UI yet — see `CUSTOMER-CRM.md` "Customer import".
- Karigar accounting (job-work gold/cash tracking) and supplier purchase
  management now exist as of Phase 5 — see `KARIGAR-SYSTEM.md`,
  `SUPPLIER-SYSTEM.md`, and `PURCHASE-SYSTEM.md`. Full general-ledger
  accounting, tax filing, and payroll remain explicitly out of scope.
- Gold reconciliation's "System Gold" figure is scoped to gold currently
  tracked in a karigar/supplier ledger — Phase 5 does not model a separate
  raw/loose shop-gold inventory not yet allocated to a party. See
  `RECONCILIATION.md`.
- A reconciliation mismatch is flagged (`RECONCILIATION_REQUIRED`) but
  never auto-corrected — applying a fix is always a separate, explicit
  adjustment a user chooses to record. See `RECONCILIATION.md` "Adjustment
  policy".
- Every module other than Dashboard, Settings, Inventory, POS, Customers,
  Karigars, Suppliers, Purchases, Gold Ledger, Cash Management, and Party
  Ledger renders a "coming in next phase" placeholder — no fake data, no
  fake functionality.

## Next phase

See the end of `PHASE-5-STATUS.md` for the recommended Phase 6 scope.
