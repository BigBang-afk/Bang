# Inventory & Stock Management (Phase 2)

## Why Product and InventoryItem are separate tables

Jewelry is not fungible quantity-stock — no two pieces weigh exactly the
same, even from the same mold. `Product` is the reusable *design* record
(name, category, supplier, karigar, photo); `InventoryItem` is one physical,
individually weighed, individually barcoded piece of that design. Today's
Add Stock flow creates exactly one of each per submission, but the schema
doesn't assume that 1:1 relationship is permanent — a future "add another
unit of this design" flow can attach a second `InventoryItem` to the same
`Product` without a schema change.

The **All Stock** table, search, and every barcode are keyed on
`InventoryItem` — that's "the stock," one row per physical, sellable piece.

## Stock creation flow

`createInventoryItem()` (`src/services/inventory-item.service.ts`) runs
inside a single `prisma.$transaction`:

1. Compute weight/gold value via the Phase 1 engine
   (`calculateGoldValue()` — never re-implemented here).
2. Compute cost/profit via `calculateInventoryPricing()`
   (`goldValue + charges = totalCost`, `sellingPrice - totalCost = profit`,
   `profit / sellingPrice * 100 = margin`).
3. Resolve whether the submitted gold rate matches today's official
   effective rate for that purity — if so, link `goldRateSourceId` for
   provenance (see "Gold rate snapshot" below).
4. Create the `Product` row.
5. Create the `InventoryItem` row with `status = IN_STOCK`.
6. Create its `Barcode` (see `BARCODE-SYSTEM.md`).
7. Record a `STOCK_CREATED` `StockMovement`.

Then, outside the transaction (writes only, no risk of a half-committed
state), two `AuditLog` entries: `STOCK_CREATED` and `BARCODE_GENERATED`.

The Add Stock **UI** never computes these values itself — `<StockForm>`
calls the `previewInventoryPricingAction` Server Action (debounced ~200ms)
on every field change, which runs the exact same two service functions the
save path uses. What's on screen while typing is always what will be
saved; see ARCHITECTURE.md for why.

## Cost calculation

```
Gold Value
+ Making Charges
+ Stone Charges
+ Diamond Charges
+ Other Charges
= Total Cost

Expected Profit = Selling Price - Total Cost
Profit Margin % = Expected Profit / Selling Price × 100
```

Worked example (from the spec):

```
Net = 10g, Wastage = 5%, Rate = 40,000
Gold Value = 420,000
Making = 15,000, Stone = 5,000, Other = 2,000
Total Cost = 442,000

Selling Price = 500,000
Expected Profit = 58,000
Profit Margin = 58,000 / 500,000 × 100 = 11.6%
```

This is `tests/inventory-pricing.service.test.ts`'s primary test case.
`calculateInventoryPricing()` (`src/services/inventory-pricing.service.ts`)
is pure and framework-agnostic, same design as the Phase 1 engine: no
premature rounding, `decimal.js` throughout, a typed
`InventoryPricingError` with a `field` for invalid input. Storage columns
round to 2dp for money / 3dp for weight at the persistence boundary — see
ARCHITECTURE.md's precision section.

A selling price below total cost is allowed, but not silently: both the
create and edit Server Actions throw
`LowerPriceConfirmationRequiredError` unless the submitted
`confirmLowerPrice` flag is set, and the UI surfaces an explicit
confirmation checkbox before it will resubmit.

## Gold rate snapshot

`InventoryItem.goldRatePerGram` is a **frozen snapshot**, not a live lookup.
If today's 21K rate is Rs. 40,000/g when a piece is costed, and the rate is
corrected to Rs. 45,000/g an hour later (or is Rs. 50,000/g a month later),
this item's stored cost rate stays Rs. 40,000/g forever — reports that
value historical inventory need this to be true, or every past sale's
margin would silently drift every time the daily rate changes.

`goldRateSourceId` is separate: an optional link to the exact `GoldRate` row
the snapshot was read from, for provenance/traceability only. It's set only
when the submitted rate matches today's effective rate exactly; a manually
entered or historical rate leaves it `null`. Either way,
`goldRatePerGram` is the number that matters.

## Product images

Uploaded via the Add/Edit Stock form (`<ProductImageField>`), validated
both client-side (instant feedback) and server-side (authoritative) for
type (`image/jpeg`, `image/png`, `image/webp`) and size (5 MB max), then
written to `public/uploads/products/<uuid>.<ext>` with a random filename
(`src/lib/uploads/product-image.ts`) — `Product.imageUrl` stores only the
reference path, never raw bytes in Postgres. Replacing or removing an
image deletes the old file best-effort.

**Known Phase 2 limitation**: local filesystem storage, documented in
`PHASE-2-STATUS.md`. A multi-instance production deployment should swap
this for object storage (S3-compatible) without changing the `imageUrl`
contract — every consumer just treats it as a URL.

This also sets up (but does not implement) future AI image enhancement /
background removal / social creative generation: those would read
`Product.imageUrl`, write a new file, and update the reference — no schema
change needed.

## Stock status

```
IN_STOCK ⇄ RESERVED ⇄ SOLD → RETURNED ⇄ (IN_STOCK | DAMAGED)
IN_STOCK / RESERVED → DAMAGED / LOST
```

`STOCK_STATUS_TRANSITIONS` (`src/types/inventory.ts`) is the single source
of truth for which transitions are legal; `changeInventoryItemStatus()`
enforces it server-side (`InvalidStatusTransitionError` on a disallowed
transition) regardless of what the UI offers. `LOST` is terminal — no
further transitions.

Every status change writes a `StockMovement` (previous/new status, the
item's gross weight, optional notes, acting user) and a
`STOCK_STATUS_CHANGED` `AuditLog` entry.

## Stock movements

Append-only ledger, one row per meaningful event on an `InventoryItem`:
`STOCK_CREATED`, `STOCK_UPDATED`, `STOCK_RESERVED`, `STOCK_SOLD`,
`STOCK_RETURNED`, `STOCK_ADJUSTED`, `STOCK_DAMAGED`, `STOCK_LOST`,
`STOCK_ARCHIVED`. `recordStockMovement()`
(`src/services/stock-movement.service.ts`) must always be called from
inside the same `$transaction` as the state change it records, so the
movement log and the actual row can never disagree.

This is the ledger Phase 3 (POS/Sales) will read from and write to for
reservations and sales — reusing it instead of inventing a parallel
transaction log is why it exists now, ahead of POS.

## Editing stock — before/after tracking

`updateInventoryItem()` diffs every financial/weight field
(`purity`, `netWeight`, `wastageType`, `wastagePercent`, `wastageWeight`,
`grossWeight`, `goldRatePerGram`, `goldValue`, the four charge fields,
`totalCost`, `sellingPrice`) between the existing row and the recomputed
values — server-side, from the submitted raw inputs, never trusting a
client-sent total. If anything changed:

- A `StockMovement` (`STOCK_UPDATED`) with `metadata.changes` — a
  `{ field: { before, after } }` map, rendered as a table in the item's
  Stock History panel.
- An `AuditLog` entry (`FINANCIAL_FIELDS_CHANGED`) with the same diff.

Non-financial edits (name, category, supplier, karigar, notes, image) are
still recorded — a `STOCK_UPDATED` `AuditLog` entry listing which fields
changed — but don't add a `StockMovement`, keeping the physical stock
ledger focused on things that affect weight or money.

Before/after values in the diff are pre-formatted (`formatCurrency`,
`formatWeight`) rather than raw `Decimal#toString()` output — the latter
strips trailing zeros (`"500000.00"` → `"500000"`), which reads wrong in a
financial audit trail.

## Search & filtering

`listInventoryItems()` builds a single Prisma query — never fetches
everything into the browser and filters client-side. Search
(`?search=`) matches product name, design number, supplier, karigar, and
category (case-insensitive `contains`), plus an exact barcode match when
the search string parses as a ZJ code (`parseBarcodeCode`). Category,
purity, status, supplier, karigar, price range, weight range, and date
range are independent `AND` filters on top of that; six sort orders
(`NEWEST`, `OLDEST`, `PRICE_HIGH/LOW`, `WEIGHT_HIGH/LOW`, `PROFIT_HIGH`) map
to `ORDER BY`. Results are paginated (`page`/`pageSize`, capped at 100 per
page) at the database level via `skip`/`take`.

The All Stock page's filter form is plain server-rendered `<form
method="GET">` — filtering/sorting/pagination work with JavaScript
disabled, same pattern as Phase 1's gold rate history filter.

## Stock valuation & the dashboard

`getInventorySummary()` returns real counts (`totalItems`, `inStock`,
`reserved`, `sold`) and real Decimal sums (`totalCostValue`,
`totalSellingValue`, `expectedGrossProfit`) — no hardcoded or fake numbers.
Per the spec, the cost/selling/profit sums **exclude `SOLD` items and
archived items** — "current inventory value" shouldn't include stock that
has already left the shop. The Phase 1 dashboard's "Inventory Value"
placeholder card was replaced with real cards backed by this function once
Inventory existed to back it.

## Old stock

`getOldStock(minDays)` — items still `IN_STOCK`, `archivedAt IS NULL`,
created at least `minDays` ago (30/60/90/180, matching the spec). No
automatic "dead stock" flag: jewelry aging is a judgment call for staff,
not an algorithm, so this page surfaces days-in-stock and lets a human
decide. `RESERVED` items are excluded — active customer interest means it
isn't "just sitting" the way unreserved stock is.

The sidebar's "Low Stock" and "Dead/Slow Stock" nav entries both route to
this one "Old Stock" page — the spec's own detail section scopes Phase 2 to
a single day-threshold view rather than two different pages, since
per-unit "low stock" quantity thresholds don't apply to individually
unique jewelry pieces.

## Deletion policy

`InventoryItem` rows are never hard-deleted. `archiveInventoryItem()` sets
`archivedAt`, which:

- Removes the item from the default (active) list, dashboard summary, and
  valuation totals.
- Never removes its `Barcode` — the sequence is never reused for anything.
- Never removes its `StockMovement` history or `AuditLog` entries.

`includeArchived: true` on `listInventoryItems()` surfaces archived items
when needed (e.g. a future "Archived" filter).

## Permissions

| Permission           | Grants                                             |
| --------------------- | --------------------------------------------------- |
| `inventory:view`      | See All Stock, item detail, history, print pages    |
| `inventory:manage`    | Create/edit/change-status/archive stock              |
| `category:manage`     | Create product categories                            |
| `barcode:print`       | Print a barcode label (records the print event)     |

`OWNER` bypasses all checks. `ADMIN` is seeded with every permission above
(configurable later, same as Phase 1). Every mutating Server Action calls
`assertPermission()`; every page calls `requirePermission()`. No component
ever checks a role name directly. `INVENTORY_MANAGER`, `CASHIER`, and
`SALESPERSON` (named in the long-term roadmap) are not seeded yet — they'll
get their own permission grants once a role-management UI exists, without
any code change to the checks themselves.

## Testing

`tests/inventory-pricing.service.test.ts` — pure pricing math (17 tests):
the spec's worked example, all four charge types, profit/loss cases,
invalid input, precision.

`tests/inventory-item.service.integration.test.ts` and
`tests/authorization.integration.test.ts` — real Postgres integration tests
(20 tests): product/stock creation, barcode uniqueness under concurrency,
ZJ sequence generation, status transitions and their movements, the
gold-rate snapshot surviving a same-day rate correction, soft
deletion/archive, search, pagination, and role-based authorization
(OWNER bypass, granted vs. ungranted permissions).

`e2e/inventory.spec.ts` — Playwright, real browser + real database: the
full Add Stock → view detail → change status → Stock History flow, the
barcode print page, and category creation.

## Known limitations

- Product images live on local disk, not object storage — see "Product
  images" above.
- Supplier and Karigar are free-text fields, not their own managed
  entities — Karigar Management and Purchases (future phases) are the
  natural place to normalize them.
- No barcode-scanner hardware integration yet — the barcode is
  machine-readable (see `BARCODE-SYSTEM.md`) but nothing in this phase
  reads a scan back in (that's POS).
- "Old Stock" has no configurable per-store threshold beyond the four
  fixed day buckets the spec names.
