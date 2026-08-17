# Phase 2 Status — Inventory, Stock & ZJ Barcode System

Status: **Complete**. Typecheck, lint, unit tests, integration tests,
Playwright end-to-end tests, and a production build all pass with zero
errors and zero warnings as of this writing. Phase 1 was re-verified
working (all its tests still pass, both Phase 1 and Phase 2 flows exercised
together in the browser) before and after this phase's changes.

## Scope delivered

- **Database** — `ProductCategory`, `Product`, `InventoryItem`, `Barcode`,
  `StockMovement`, plus `WastageType`/`StockStatus`/`StockMovementType`
  enums and 8 new `AuditAction` values. No changes to any Phase 1 table.
  See `DATABASE.md`.
- **Inventory navigation** — Inventory promoted from "coming in next
  phase" to a real module with 6 sub-nav tabs: All Stock, Add Stock, Stock
  Movements, Categories, Barcodes, Old Stock.
- **Product identification** — atomic, database-generated `ZJ-000001`
  style barcodes, race-free under concurrency, never reused. See
  `BARCODE-SYSTEM.md`.
- **Add/Edit Stock** — the full form from the spec (product info, gold
  info, cost info, image upload), server-verified live calculation preview,
  before/after change tracking on edit. See `INVENTORY.md`.
- **Categories** — 14 seeded defaults matching the spec's list, unique
  names, owner/admin can add more.
- **Gold rate snapshot** — every stock item freezes the gold rate used to
  cost it; the daily rate changing afterward never retroactively changes a
  stock item's stored cost or margin.
- **Product images** — upload with client + server validation (type, 5 MB
  size cap), preview, replace, remove; stored as a URL reference on local
  disk, never raw bytes in Postgres.
- **All Stock** — real dashboard summary cards (Total Items, In Stock,
  Reserved, Sold, Total Cost Value, Total Selling Value, Expected Gross
  Profit), server-side search/filter/sort/pagination, empty state.
- **Stock status & movements** — enforced status-transition graph, every
  transition recorded as a `StockMovement`; a global Stock Movements ledger
  page.
- **Edit history** — financial/weight field changes recorded with
  before/after values, both in the item's Stock History timeline and the
  system audit log; a selling price below cost requires explicit
  confirmation rather than saving silently.
- **Barcode printing** — single and batch label printing, a real scannable
  CODE128 symbol plus the human-readable code, print-count tracking,
  print-only layout (app chrome hidden via CSS). A separate "Print Product"
  information sheet. See `BARCODE-SYSTEM.md`.
- **Old Stock** — 30/60/90/180-day aging view, no automatic "dead stock"
  flag.
- **Permissions** — `inventory:view`, `inventory:manage`,
  `category:manage`, `barcode:print`, following the exact Phase 1 pattern
  (database-backed RBAC, `OWNER` bypass, `ADMIN` seeded with every grant).
- **Tests** — 45 new Vitest tests (17 pricing + 8 barcode-code + 16
  integration + 4 authorization) plus 3 new Playwright end-to-end tests,
  for 82 unit/integration and 6 end-to-end tests total across both phases.
- **Documentation** — this file, `INVENTORY.md`, `BARCODE-SYSTEM.md`, plus
  updates to `ARCHITECTURE.md` and `DATABASE.md`.

## Files created

Schema: `prisma/migrations/20260816135530_phase2_inventory_barcode_system/`.

Services: `inventory-pricing.service.ts`, `inventory-item.service.ts`,
`stock-movement.service.ts`, `product-category.service.ts`.

Lib: `barcode-code.ts`, `uploads/product-image.ts`, `validation/inventory.ts`.

Actions: `actions/inventory.actions.ts`, `actions/inventory-pricing.actions.ts`,
`actions/category.actions.ts`.

Types: `types/inventory.ts`.

Components (`components/inventory/`): `stock-form.tsx`,
`product-image-field.tsx`, `inventory-table.tsx`, `inventory-filters.tsx`,
`inventory-summary-cards.tsx`, `stock-status-badge.tsx`, `pagination.tsx`,
`status-change-form.tsx`, `archive-item-button.tsx`,
`stock-history-timeline.tsx`, `barcode-svg.tsx`, `barcode-label.tsx`,
`barcode-selection-grid.tsx`, `product-print-sheet.tsx`, `print-button.tsx`,
`create-category-form.tsx`. Plus `components/layout/sub-nav-tabs.tsx` and
`components/dashboard/real-metric-card.tsx`.

Routes (`app/(app)/inventory/`): `layout.tsx`, `page.tsx` (All Stock),
`add/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`,
`[id]/print/barcode/page.tsx`, `[id]/print/product/page.tsx`,
`categories/page.tsx`, `barcodes/page.tsx`, `barcodes/print/page.tsx`,
`movements/page.tsx`, `old-stock/page.tsx`.

Tests: `tests/inventory-pricing.service.test.ts`, `tests/barcode-code.test.ts`,
`tests/inventory-item.service.integration.test.ts`,
`tests/authorization.integration.test.ts`, `tests/setup.ts`,
`tests/mocks/empty.ts`, `tests/helpers/db-fixtures.ts`, `e2e/inventory.spec.ts`.

## Files modified

- `prisma/schema.prisma`, `prisma/seed.ts` — new entities, permissions,
  categories.
- `src/lib/auth/permissions.ts` — 4 new permission keys.
- `src/services/gold-rate.service.ts` — added `id` to `EffectiveRateRow`
  (additive; needed to link a stock item's gold-rate snapshot back to its
  source row). No existing behavior changed.
- `src/config/nav.ts` — Inventory marked `active`; added
  `INVENTORY_SUB_NAV`.
- `src/app/(app)/inventory/page.tsx` — replaced the Phase 1 "coming soon"
  placeholder with the real All Stock page.
- `src/app/(app)/dashboard/page.tsx` — the "Inventory Value" placeholder
  card was replaced with real inventory summary cards now that the module
  exists (no other Phase 1 dashboard content changed).
- `src/components/layout/sidebar.tsx`, `topbar.tsx`,
  `sub-nav-tabs.tsx` — added `print:hidden` for clean barcode/product
  print output.
- `vitest.config.mts` — added a setup file (loads `.env`) and a
  `server-only` → no-op alias so Phase 2's integration tests (which import
  services marked server-only) can run under Vitest's plain Node
  environment. No effect on the actual app.

## Database migrations

`20260816135530_phase2_inventory_barcode_system` — adds `product_categories`,
`products`, `inventory_items`, `barcodes`, `stock_movements`; extends
`AuditAction`; adds `WastageType`, `StockStatus`, `StockMovementType` enums.
Applied cleanly against the existing Phase 1 database with zero data loss —
verified by re-running the full Phase 1 test suite and e2e flow afterward.

## Inventory features completed

Add/View/Edit stock, product categories (seeded + custom), image upload
with preview/replace/remove, server-verified live pricing calculation,
gold-rate snapshotting, stock status transitions with enforced rules,
stock movement ledger (per-item and global), before/after financial change
tracking, soft deletion (archive), server-side search/filter/sort/
pagination, real inventory dashboard metrics, old-stock aging view.

## Barcode features completed

Atomic ZJ-NNNNNN generation (database sequence, race-free — proven under
concurrency in tests), real CODE128 scannable symbol + human-readable code,
single and batch label printing, print-count/last-printed tracking,
configurable label dimensions (CSS variables, no hardcoded printer),
print-only page layout, separate product information print sheet.

## Tests passed

```
Vitest:      82 passed, 0 failed  (7 files — 37 Phase 1 + 45 Phase 2)
Playwright:   6 passed, 0 failed  (3 Phase 1 + 3 Phase 2, real browser, real Postgres)
TypeScript:   0 errors  (tsc --noEmit)
ESLint:       0 errors, 0 warnings
```

Covers all 18 scenarios requested: product creation, barcode uniqueness,
ZJ sequence generation (including under concurrency), weight/wastage/gold
value calculations, making/stone charges, total cost, expected profit,
profit margin, stock status transitions, stock movement creation,
authorization (OWNER bypass, granted vs. ungranted permissions), historical
gold-rate snapshot survival, soft deletion, search, and pagination.

## Build status

`npm run build` succeeds cleanly (Turbopack production build, 25 routes).
Manually verified in a real browser: create stock → server-computed
wastage/gross weight/gold value/cost/profit appear correctly → save →
barcode assigned → item appears in All Stock search → status change →
Stock History shows both the creation and status-change movements →
barcode label and product sheet print pages render correctly.

One real bug was found and fixed during this manual pass: two client
components (`<StockForm>`'s edit mode, `<BarcodeSelectionGrid>`) were
receiving Prisma `Decimal` values directly from their Server Component
parents, which Next.js rejects at runtime (TypeScript doesn't catch it).
Fixed by serializing to plain strings before the Server→Client boundary in
both cases — see ARCHITECTURE.md's "Pitfall" section, added specifically
so this class of bug is easy to recognize next time.

## Known issues

None outstanding. See "Known limitations" in `INVENTORY.md` and
`BARCODE-SYSTEM.md` for scoped-out-on-purpose items (object storage for
images, Supplier/Karigar as normalized entities, barcode-scanner input,
configurable label-size UI) — none of these block Phase 2's stated
objective.

## Exact commands to run

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
npm run db:migrate          # applies the Phase 2 migration on top of Phase 1
npm run db:seed             # re-seeds permissions/categories (idempotent)
npm run dev
```

Then open `http://localhost:3000`, sign in with the credentials printed by
`db:seed`, and go to **Inventory** in the sidebar.

## Recommended Phase 3

**POS + Sales**, directly consuming what Phase 2 built: the barcode scan
target, the `InventoryItem`/`StockMovement` model (a sale becomes a
`STOCK_SOLD` movement + status transition, already wired), and the
calculation engines (Phase 1's weight/gold-value engine and Phase 2's
cost/pricing engine, both already server-action-driven for live preview).
Building POS next validates that this phase's data model holds up under a
real transactional workflow before Customer CRM, Purchases, and the
AI/marketing modules layer on top. Do not start POS/Sales/Invoices/CRM
work in this phase — that is explicitly Phase 3+ scope.
