# Phase 3 Status — POS + Sales + Invoices + Barcode Checkout

Status: **Complete**. Typecheck, lint, unit tests, integration tests,
Playwright end-to-end tests, and a production build all pass with zero
errors and zero warnings as of this writing. Phase 1 and Phase 2 were
re-verified working (all their tests still pass, and all three phases'
flows were exercised together in a real browser against a real Postgres
database) before this status was written.

## Scope delivered

- **Database** — `Customer`, `Sale`, `SaleItem`, `Payment`, `Invoice`,
  `Return`, plus `PaymentMethod`/`DiscountType`/`SaleStatus`/`ReturnStatus`
  enums and 9 new `AuditAction` values. A nullable `saleId` was added to
  `StockMovement` (additive). No changes to any Phase 1/2 table's existing
  columns. See `DATABASE.md`.
- **POS navigation** — POS promoted from "coming in next phase" to a real
  module with 4 sub-nav tabs: New Sale, Sales History, Returns, Invoices.
  The standalone "Sales" sidebar placeholder from Phase 1 was folded into
  POS (its exact stated purpose — "sales history and invoicing" — is what
  this phase delivers), so there is one module for it, not two. See
  `POS.md`.
- **New Sale screen** — barcode scan (USB-scanner-as-keyboard input) +
  product search in one bar, a full cart with per-line discount, a minimal
  customer picker (search or add, walk-in by default), a payment panel
  supporting multiple split payment lines, and a live, 100%-server-computed
  pricing/balance preview on every change. Keyboard shortcuts: `F2`/`Ctrl+K`
  focus search, `Enter` scan-or-add, `Delete`/`Backspace` remove a focused
  cart row, `Ctrl+Enter` complete sale. See `POS.md`.
- **Sale transaction engine** — `completeSale()`: validates inventory
  availability, discount permission, and payment balance; then one
  `$transaction` that atomically re-checks-and-flips each item
  IN_STOCK → SOLD, writes `Sale`/`SaleItem`/`Payment`/`Invoice`, and records
  a `STOCK_SOLD` `StockMovement` per item. Audit logs written after commit.
  See `SALES.md`.
- **Concurrency protection** — proven under real concurrent load in
  integration tests: 5 simultaneous checkout attempts for the same unique
  item produce exactly 1 success, via Postgres row-level locking on a
  conditional `updateMany` — no explicit locking code needed.
- **Discounts** — fixed or percentage, server-recalculated, capped by a
  `SystemSetting`-backed max-discount-% per role (`OWNER` uncapped;
  everything else defaults to 0% until configured — never "unlimited" by
  accident).
- **Tax** — `SystemSetting`-backed, disabled by default, percentage never
  hardcoded.
- **Payments** — `CASH`/`CARD`/`BANK_TRANSFER`/`OTHER`/`CREDIT`, multiple
  lines per sale, must sum exactly to the grand total (no overpayment/
  change-due support, per the spec's stated default). A `CREDIT` line
  requires a selected customer and increments
  `Customer.outstandingBalance` — the transactional foundation for a future
  full customer ledger, not the ledger itself.
- **Customer** — minimal search/create (name, unique phone, optional
  email/notes); walk-in sales never create a placeholder `Customer` row.
- **Invoice numbering** — `ZJ-INV-000001`, a real Postgres autoincrement
  column as the source of truth, mirroring the Phase 2 barcode pattern
  exactly. Proven unique under 6 concurrent sales in integration tests.
- **Printable invoice** — A4, luxury branding on-screen elsewhere in the
  app but white/black on the printed page for legibility; full item table
  with every charge column; configurable business info and footer text;
  print-count tracking. See `INVOICE-SYSTEM.md`.
- **Real PDF invoices** — server-rendered via `@react-pdf/renderer`
  (selectable text, not a screenshot), served through the app's first
  Route Handler (`api/invoices/[id]/pdf`), with its own explicit
  permission check since Route Handlers aren't wrapped by any layout.
  Verified to produce a genuine `%PDF-`-headed file both in an integration
  test and over a real authenticated browser session in e2e.
- **WhatsApp-ready sharing** — a `wa.me` deep link pre-filled with the
  invoice details; architecture only, no automated sending, per the spec.
- **Sales History** — search (invoice number, customer name/phone,
  barcode), filters (date range, payment status, sale status), 4 sort
  orders, server-side pagination.
- **Sale Detail** — full item/payment/customer breakdown, Print/PDF/Return
  actions.
- **Returns foundation** — deliberately two steps: `requestReturn()` (zero
  inventory side effect) and `approveReturn()` (the only path that moves
  inventory SOLD → RETURNED, atomically with the `Return` and `Sale`
  status updates, gated by a stronger `sales:return` permission). No
  exchange workflow. See `SALES.md`.
- **Permissions** — `sales:view`, `sales:create`, `sales:return`, following
  the exact Phase 1/2 RBAC pattern (database-backed, `OWNER` bypass,
  enforced server-side in every Server Action and the PDF Route Handler,
  never only in the UI).
- **Tests** — 58 new Vitest tests (24 pricing + 9 invoice-number + 21
  sale-transaction integration + 1 PDF-generation integration + 3
  authorization) plus 3 new Playwright end-to-end tests, for **140**
  unit/integration and **9** end-to-end tests total across all three
  phases.
- **Documentation** — this file, `POS.md`, `SALES.md`,
  `INVOICE-SYSTEM.md`, plus updates to `README.md`, `ARCHITECTURE.md`, and
  `DATABASE.md`.

## Files created

Schema: `prisma/migrations/20260816150048_phase3_pos_sales_invoices/`.

Services (`src/services/`): `sale-pricing.service.ts`,
`sales-settings.service.ts`, `customer.service.ts`,
`sale-preview.service.ts`, `sale-transaction.service.ts`, `sale.service.ts`,
`returns.service.ts`.

Lib: `lib/settings-keys.ts`, `lib/invoice-number.ts`,
`lib/validation/sales.ts`.

Actions: `lib/actions/sales.actions.ts`.

Types: `types/sales.ts`.

Components (`components/pos/`): `pos-screen.tsx`, `cart-panel.tsx`,
`payment-panel.tsx`, `customer-picker.tsx`, `sale-status-badge.tsx`,
`sales-filters.tsx`, `sales-table.tsx`, `request-return-button.tsx`,
`approve-return-button.tsx`, `whatsapp-share-button.tsx`,
`invoice-print-sheet.tsx`, `invoice-pdf-document.tsx`.

Routes (`app/(app)/pos/`): `layout.tsx`, `page.tsx` (New Sale),
`sales/page.tsx`, `sales/[id]/page.tsx`, `sales/[id]/invoice/page.tsx`,
`returns/page.tsx`, `invoices/page.tsx`. Route Handler:
`app/api/invoices/[id]/pdf/route.ts`.

Tests: `tests/sale-pricing.service.test.ts`, `tests/invoice-number.test.ts`,
`tests/sale-transaction.service.integration.test.ts`,
`tests/invoice-pdf.integration.test.ts`, `e2e/pos.spec.ts`.

Docs: `POS.md`, `SALES.md`, `INVOICE-SYSTEM.md`, `PHASE-3-STATUS.md`.

## Files modified

- `prisma/schema.prisma`, `prisma/seed.ts` — new entities, permissions,
  discount-limit/tax/business-contact settings.
- `src/lib/auth/permissions.ts` — 3 new permission keys
  (`sales:view`/`sales:create`/`sales:return`).
- `src/services/inventory-item.service.ts` — added
  `getInventoryItemByBarcode()`, `searchInventoryForSale()`, and
  `toPosCatalogItem()` (all additive reads for POS); refactored
  `changeInventoryItemStatus()` to extract a reusable
  `transitionInventoryStatusInTx()` primitive so `approveReturn()` can
  compose the identical atomic status-transition logic inside its own,
  broader transaction instead of duplicating it or nesting transactions.
  Phase 2 behavior unchanged — proven by the full Phase 2 test suite and
  e2e flow still passing.
- `src/services/stock-movement.service.ts` — added an optional `saleId` to
  `RecordMovementInput`, passed through to the `StockMovement` row.
  Additive; Phase 2 callers that don't pass it are unaffected.
- `src/config/nav.ts` — POS marked `active` with a real description; added
  `POS_SUB_NAV`; removed the standalone "Sales" placeholder entry (see
  "POS navigation" above).
- `src/components/layout/sub-nav-tabs.tsx` — generalized the "is this the
  root tab" check from a hardcoded `"/inventory"` string to
  `items[0]?.href`, so the same component works correctly for both
  Inventory's and POS's sub-nav (without this fix, "New Sale" would have
  stayed highlighted on every POS sub-page). Phase 2's Inventory sub-nav
  behavior is unchanged since its root href is still the first item.
- `src/app/(app)/sales/page.tsx` — **removed**; its stated purpose ("sales
  history and invoicing") is exactly what `(app)/pos/sales` now delivers,
  so keeping both would have meant two modules for one feature.

## Database migrations

`20260816150048_phase3_pos_sales_invoices` — adds `customers`, `sales`,
`sale_items`, `payments`, `invoices`, `returns`; extends `AuditAction`;
adds `PaymentMethod`, `DiscountType`, `SaleStatus`, `ReturnStatus` enums;
adds a nullable `saleId` FK to `stock_movements`. Applied cleanly on top of
the existing Phase 1 + Phase 2 database with zero data loss — verified by
re-running the full Phase 1 and Phase 2 test suites and e2e flows
afterward.

## POS features completed

Barcode scan-to-cart, product search-to-cart, duplicate-item and
unavailable-item rejection with specific messaging, per-item discount
(fixed/percentage) with live server-side validation against the role's
configured limit, a minimal customer picker (search/create/walk-in), a
multi-line payment panel with live balance calculation, keyboard shortcuts,
and double-submit protection (client-side guard plus the server-side
atomic-update guarantee that makes a true duplicate sale impossible either
way).

## Sales features completed

The full 14-step transactional checkout flow, historical pricing/gold-rate
snapshotting per sale item (immune to later gold-rate or product edits),
Sales History with search/filter/sort/pagination, Sale Detail with full
line-item/payment/customer breakdown, and the two-step returns foundation
(request → approve, inventory only ever moves on approval).

## Payment features completed

5 payment methods, multiple split-payment lines per sale, exact-match
validation against the grand total, `CREDIT` requiring a selected customer
and incrementing that customer's outstanding balance.

## Invoice features completed

`ZJ-INV-000001` numbering (race-free, proven under concurrency), a
professional A4 printable layout with every spec-listed column, real
selectable-text PDF generation via a dedicated Route Handler with its own
auth check, print/download counters, and WhatsApp-ready share links.

## Inventory integration

A sale marks its items `SOLD` via the exact same atomic conditional-update
primitive Phase 2's status-transition logic uses, and records a
`STOCK_SOLD` `StockMovement` linked back to the sale via the new nullable
`saleId` column. An approved return moves an item `SOLD` → `RETURNED` the
same way, linked to the same movement ledger. No inventory item is ever
deleted; barcodes are never reused; every state change remains visible in
the item's existing Stock History timeline from Phase 2.

## Tests passed

```
Vitest:      140 passed, 0 failed  (11 files — 82 Phase 1+2 + 58 Phase 3)
Playwright:    9 passed, 0 failed  (3 Phase 1 + 3 Phase 2 + 3 Phase 3, real browser, real Postgres)
TypeScript:    0 errors  (tsc --noEmit)
ESLint:        0 errors, 0 warnings
```

Covers all 19 scenarios requested — barcode lookup, product search, add to
cart, duplicate-cart rejection, discount calculation, discount permission,
payment calculation, partial payment, full payment, credit sale, invoice
number uniqueness, the full sale transaction, inventory status update,
stock movement creation, historical pricing snapshot survival,
authorization (role with no grants / view-only / OWNER bypass), the
returns foundation (request without inventory effect, duplicate-request
rejection, approve moves inventory + sale status), double-submit
protection, and real PDF invoice generation — plus the explicit "critical
integration test" (scan → sale → Sale/Invoice/Payment created, inventory
SOLD, `STOCK_SOLD` movement, audit log written) and the concurrency test
(5 simultaneous sale attempts on one item, exactly 1 succeeds).

## Build status

`npm run build` succeeds cleanly (Turbopack production build, 31 routes,
including the new `api/invoices/[id]/pdf` Route Handler). Manually verified
end-to-end in a real browser via Playwright against a real Postgres
database: add stock → scan/search it into a POS cart → apply a 10%
discount and see the grand total recompute live → pay in full by cash →
complete the sale → invoice number and grand total shown in a confirmation
dialog → sale appears in Sales History by invoice-number search → Sale
Detail shows the correct item/payment/status → the invoice print page
renders with the discounted total → the PDF download link returns a real,
non-trivial `%PDF-`-headed file over an authenticated session → scanning
the same barcode again is cleanly rejected, not silently re-added.

No new class of bug was found during this manual pass — the Phase 2
"Decimal can't cross the Server→Client boundary" pitfall was avoided from
the start in every new client component by using the established
`toPosCatalogItem()`/`toCustomerSearchResult()` string-projection pattern.

## Known issues

None outstanding. Scoped out on purpose (see "Known limitations" in
`README.md`, and the explicit "DO NOT BUILD YET" list in this phase's
spec): payment-gateway processing, overpayment/change due, the full
customer ledger, Karigar accounting, WhatsApp automation, thermal/receipt
printer templates, a complete exchange workflow for returns, and a
role-management UI for configuring discount limits (currently only
settable via `setMaxDiscountPercentForRole()` at the service layer — no
Settings page wires it up yet).

## Exact commands to run

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
npm run db:migrate          # applies the Phase 3 migration on top of Phase 1 + 2
npm run db:seed             # re-seeds permissions/settings (idempotent)
npm run dev
```

Then open `http://localhost:3000`, sign in with the credentials printed by
`db:seed`, add a stock item under **Inventory**, and go to **POS** in the
sidebar to sell it.

## Recommended Phase 4

**Full Customer CRM + Customer Ledger + Karigar Accounting**, directly
consuming what Phase 3 built: the `Customer` table (name/phone/email/notes
already in place, ready for a full profile + purchase-history view), the
`Customer.outstandingBalance` column (ready for a real ledger with
payment-against-balance entries, not just increments), and the `Sale`/
`SaleItem`/`Return` model (ready to drive loyalty/repeat-purchase
reporting once a CRM exists to attach it to). Building the CRM next
validates that Phase 3's minimal customer foundation holds up under real
relationship-management workflows before WhatsApp automation and AI
marketing — which both need a real customer/contact model to target — layer
on top. Do not start WhatsApp automation, AI marketing, the AI assistant,
loyalty/referral programs, advanced analytics, AI photography, or supplier
management in this phase — those are explicitly Phase 4+ scope.
