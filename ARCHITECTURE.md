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
- `inventory-pricing.service.ts` *(Phase 2)* — the cost/profit calculation
  (`goldValue + charges = totalCost`, `sellingPrice - totalCost = profit`,
  ...). Pure, `decimal.js`-based, same pattern as the gold calculation
  engine — deliberately kept separate from it so weight/gold-value math and
  cost/profit math each stay a single-purpose function. See `INVENTORY.md`.
- `inventory-item.service.ts` *(Phase 2)* — Product/InventoryItem/Barcode
  CRUD, status transitions, search/filter/pagination, the inventory
  dashboard summary, and old-stock aging. Talks to Prisma; orchestrates the
  two pure calculation services above plus `stock-movement.service.ts` and
  `audit.service.ts` inside a single `$transaction`.
- `stock-movement.service.ts` *(Phase 2)* — the append-only movement ledger
  for a single InventoryItem. `recordStockMovement()` must always be called
  from inside the same transaction as the state change it records.
- `product-category.service.ts` *(Phase 2)* — category list/create.
- `sale-pricing.service.ts` *(Phase 3)* — pure, `decimal.js`-based sale math:
  per-item discount calculation, sale totals (subtotal/discount/tax/grand
  total), and payment-sum validation. No Prisma, no React — the exact same
  functions run for the live checkout preview and the authoritative
  checkout write. See `SALES.md`.
- `sales-settings.service.ts` *(Phase 3)* — reads/writes the
  `SystemSetting`-backed discount-limit-by-role and tax configuration (see
  "Settings as data" below).
- `sale-preview.service.ts` *(Phase 3)* — read-only, non-authoritative
  pricing preview for the New Sale screen. Wraps `sale-pricing.service.ts`
  but reports invalid lines inline instead of throwing, since a cart is
  normal to be mid-edit. See `SALES.md` "Live pricing preview".
- `customer.service.ts` *(Phase 3, extended Phase 4)* — customer identity
  CRUD, search, duplicate detection, and the All Customers list (a raw-SQL
  aggregate query — see "Raw SQL for aggregate customer stats" below).
  Started in Phase 3 as a minimal POS picker; Phase 4 extends the same file
  rather than replacing it, since POS still depends on it unchanged. See
  `CUSTOMER-CRM.md`.
- `sale-transaction.service.ts` *(Phase 3, ledger wiring added Phase 4)* — `completeSale()`, the core POS
  engine: validates the cart, customer, discounts, and payments; then opens
  one `$transaction` that atomically re-checks and flips each item's status
  IN_STOCK → SOLD, writes the `Sale`/`SaleItem`/`Payment`/`Invoice` rows, and
  records a `StockMovement` per item. See `SALES.md`.
- `sale.service.ts` *(Phase 3)* — read side: sale list (search/filter/
  sort/paginate) and detail, plus invoice print/download counters.
- `returns.service.ts` *(Phase 3)* — the two-step returns foundation:
  `requestReturn()` (no inventory side effect) and `approveReturn()` (the
  only path that moves inventory SOLD → RETURNED, atomically with the
  `Return` and `Sale` status updates). See `SALES.md` "Returns foundation".
- `customer-ledger.service.ts` *(Phase 4)* — `appendCustomerLedgerEntry()`,
  the single write path for `Customer.outstandingBalance` and every
  `CustomerLedgerEntry` row; also the company-wide ledger read model and
  `reconcileCustomerBalance()`. See `CUSTOMER-LEDGER.md`.
- `customer-payment.service.ts` *(Phase 4)* — `recordCustomerPayment()`,
  the "Receive Customer Payment" transaction: validates the amount and
  overpayment policy, then writes a `CustomerPayment` row and a ledger
  entry together. See `CUSTOMER-LEDGER.md` "Payment transaction".
- `customer-notes.service.ts` *(Phase 4)* — structured, multi-entry note
  history — an edit never overwrites a previous note.
- `customer-preference.service.ts` *(Phase 4)* — business preferences
  (preferred purity/metal/categories/price range/contact method).
- `customer-activity.service.ts` *(Phase 4)* — the profile page's Activity
  tab, composed from the existing `AuditLog` architecture rather than a
  parallel event table — see "Reusing AuditLog for customer activity" below.
- `customer-analytics.service.ts` *(Phase 4)* — lifetime value, the
  centralized segmentation rule set (`computeCustomerSegments()` — the only
  place VIP/inactive/high-value/etc. logic is allowed to live), dashboard
  summary counts, and birthday/anniversary reminders. See
  `CUSTOMER-SEGMENTS.md`.

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

### `src/app/api/` *(Phase 3)*

Route Handlers — the app's first, used only where a Server Action can't do
the job: binary file downloads. `api/invoices/[id]/pdf/route.ts` streams a
generated PDF back with `Content-Type: application/pdf`. Route Handlers are
**not** wrapped by any layout, so unlike a page under `(app)/`, this file
calls `getCurrentUser()` / `userHasPermission()` itself, explicitly, before
touching any data — see `INVOICE-SYSTEM.md`.

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
  `ComingSoon`, `SubNavTabs` (the sub-navigation pattern Inventory
  introduced in Phase 2 — reusable for any future module that needs it).
- `gold-rate/`, `calculator/`, `dashboard/`, `auth/`, `inventory/` — feature
  components. These call Server Actions and services but contain no
  business math themselves.

### `src/app/`

- `login/` — public.
- `(app)/` — a route group (doesn't affect the URL) whose `layout.tsx` is
  the single place that (a) requires a session, (b) checks whether today's
  gold rate has been entered, and (c) renders the sidebar/topbar shell
  around every authenticated page.
- `(app)/inventory/` *(Phase 2)* — its own nested `layout.tsx` requires
  `inventory:view` once and renders the All Stock/Add Stock/Movements/
  Categories/Barcodes/Old Stock sub-nav tabs around every page beneath it.
  `[id]/` is the single-item detail/edit/print routes; `barcodes/print` and
  `[id]/print/*` are dedicated print-only routes (no app chrome — see
  `BARCODE-SYSTEM.md`).
- `(app)/pos/` *(Phase 3)* — its own nested `layout.tsx` requires
  `sales:view` once and renders the New Sale/Sales History/Returns/Invoices
  sub-nav tabs. `page.tsx` is the checkout screen (`<PosScreen>`, a Client
  Component so it can respond to a USB barcode scanner's keystrokes and
  debounce live server previews); `sales/[id]/page.tsx` is the sale detail
  view; `sales/[id]/invoice/page.tsx` is the print-only invoice layout (same
  `print:hidden` pattern as Phase 2's barcode print pages). See `POS.md` and
  `SALES.md`.
- `(app)/customers/` *(Phase 4)* — its own nested `layout.tsx` requires
  `customers:view` once and renders the All Customers/Add Customer/
  Customer Ledger/VIP Customers/Inactive Customers/Customer Segments
  sub-nav tabs. `[id]/page.tsx` is the profile page — a Server Component
  that pre-renders each tab's content (Overview/Purchases/Invoices/Ledger/
  Payments/Notes/Preferences/Activity) and hands the finished JSX to a
  small `"use client"` `<CustomerProfileTabs>` wrapper purely for tab
  switching, so none of that data has to be re-serialized across a
  Server→Client boundary — see "Pitfall" below for why that matters.
  `[id]/edit/page.tsx` is the edit form. See `CUSTOMER-CRM.md`.

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
- Phase 2 adds `inventory:view`, `inventory:manage`, `category:manage`, and
  `barcode:print`, following the exact same pattern — declared in
  `PERMISSIONS`, seeded, granted to `OWNER`/`ADMIN` in `prisma/seed.ts`.
  `INVENTORY_VIEW` gates read access (the whole `(app)/inventory` route
  group checks it once in `inventory/layout.tsx`); `INVENTORY_MANAGE` gates
  every mutation (create/edit/status-change/archive).
- Phase 3 adds `sales:view`, `sales:create`, and `sales:return`. `SALES_VIEW`
  gates the whole `(app)/pos` route group (checked once in `pos/layout.tsx`)
  plus the PDF Route Handler; `SALES_CREATE` gates checkout itself
  (`completeSaleAction` and every POS lookup/preview action);
  `SALES_RETURN` gates `approveReturn()` only — any authenticated user with
  `sales:view` can *request* a return (see `SALES.md`), but approving one
  (the step that actually moves inventory) needs the stronger grant. `OWNER`
  bypasses all three, same as every other module.
- Phase 4 adds 8 `customers:*` permissions — `view`, `create`, `manage`,
  `notes`, `ledger`, `payment`, `export`, `segments` — deliberately more
  granular than Phase 2/3's 2-3 keys per module, because the spec's role
  matrix (CASHIER can create a customer and add notes but not edit one;
  ACCOUNTANT owns the ledger and payments; MARKETING_MANAGER owns
  segmentation; only OWNER/ADMIN export) genuinely needs that many distinct
  boundaries to express without collapsing two different staff
  responsibilities into one permission. Only `OWNER`/`ADMIN` are seeded
  with grants today (see "Known limitations" in `README.md`), but the keys
  themselves already encode each future role's intended boundary — wiring
  them up is a data change, not a code change, once a role-management UI
  exists.

## Settings as data — discount limits & tax *(Phase 3)*

Two more policies that must never be hardcoded live in the same
`SystemSetting` key/value table Phase 1 introduced for business info:

- **Discount limit by role** — `discount.max_percent.<ROLE_NAME>` (see
  `src/lib/settings-keys.ts`). `getMaxDiscountPercentForRole()` in
  `sales-settings.service.ts` reads it, falling back to **0%** — not
  "unlimited" — for a role that was never configured, so a missing setting
  can never silently grant more discount than intended. `OWNER` always
  bypasses this, identically to every permission check.
- **Tax** — `tax.enabled` (default `"false"`) and `tax.percent` (default
  `"0"`). Disabled by default per the spec; a business that doesn't charge
  sales tax sees no tax line anywhere, ever, until an owner turns it on in
  Settings.

Both are read fresh on every `completeSale()` call and every live preview —
never cached in a session or baked into a JWT — so an owner's change takes
effect on the very next sale.

## Settings as data — VIP threshold, inactivity, overpayment *(Phase 4)*

Three more `SystemSetting` keys, same pattern: `customer.vip_spending_threshold`
(default 2,000,000), `customer.inactivity_days` (default 90), and
`customer.overpayment_allowed` (default `"false"`). `customer-analytics.service.ts`
and `customer-payment.service.ts` read these fresh on every call — an owner
tuning the VIP bar or the inactivity window takes effect immediately,
everywhere, with no cache to invalidate. See `CUSTOMER-SEGMENTS.md`.

## The ledger primitive — one write path, everywhere *(Phase 4)*

`appendCustomerLedgerEntry(tx, input)` (`customer-ledger.service.ts`) is the
**only** code allowed to change `Customer.outstandingBalance`. It does one
atomic `UPDATE customers SET "outstandingBalance" = "outstandingBalance" +
delta ... RETURNING "outstandingBalance"` — a single SQL statement, so
Postgres's row lock serializes two concurrent writers to the same customer
(a credit sale and a payment landing at the same instant, say) without any
application-level locking — then creates the `CustomerLedgerEntry` row with
the exact balance the UPDATE just returned as `balanceAfter`. Both
`completeSale()` (Phase 3, wired to the ledger in Phase 4) and
`recordCustomerPayment()` call this same function inside their own
transaction; neither ever touches the `outstandingBalance` column directly.
This is what makes the cached balance and the ledger provably unable to
drift apart — see `CUSTOMER-LEDGER.md`.

## Raw SQL for aggregate customer stats *(Phase 4)*

Total spending, purchase count, and last-purchase date are **not** cached
columns on `Customer` — they're computed live, on every read, via a
parameterized `Prisma.sql` join against `sales` (excluding `RETURNED`
sales). This is deliberate: a cached "total spending" column would need
`approveReturn()` (Phase 3) to reach back and decrement it, and Phase 3's
returns foundation was explicitly built to *not* grow that kind of
cross-module coupling yet. A live aggregate is automatically correct
whenever a sale's status changes for any reason, present or future, with
nothing to keep in sync. Every dynamic filter/sort value in
`listCustomers()`, `listVipCustomers()`, `listInactiveCustomers()`, and
`getSegmentCounts()` is passed through `Prisma.sql`/`Prisma.join` as a
bound parameter — never string-interpolated — so this stays injection-safe
despite being raw SQL. Customer counts at a single jewelry store's scale
make a full live join completely fine performance-wise; this is not a
pattern to reach for by default at a larger scale. See `CUSTOMER-CRM.md`
"Why spending isn't cached".

## Reusing AuditLog for customer activity *(Phase 4)*

The profile page's Activity tab does not introduce a parallel
"CustomerEvent" table — it queries the existing `AuditLog` two ways: rows
logged directly against the customer (`entity = "Customer"`, `"CustomerNote"`,
or `"CustomerPayment"`, `entityId = customerId`), plus rows logged against
any `Sale`/`Invoice` the customer made (matched via that customer's own
sale IDs, since a `SALE_COMPLETED` or `INVOICE_GENERATED` entry is written
against the `Sale`, not the `Customer` — see `SALES.md`). One audit
architecture, two read shapes, no new write path.

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

`GoldCalculator` and `StockForm` both call a Server Action
(`calculateGoldValueAction`, `previewInventoryPricingAction`) on every input
change, debounced by ~200ms, instead of running the math client-side. This
means the number a salesperson sees on screen is always the server's
answer, not a client-side computation the browser could be tricked into
faking — the same two services that compute the live preview also compute
the value that actually gets saved, via `inventory-item.service.ts`.

`<PosScreen>` *(Phase 3)* follows the identical pattern, taken one step
further: `sale-pricing.service.ts` (discount math, totals, payment-sum
validation) has zero Prisma/HTTP dependencies, so it would be *technically*
possible to import it straight into the client bundle and compute a live
total with no network round trip. The codebase deliberately doesn't do
that — `previewCartAction`/`previewPaymentBalanceAction` wrap it in a
Server Action instead, so the discount-limit-by-role and tax settings
(both DB-backed, ownership-sensitive config) never ship to the browser, and
the number the cashier sees can never drift from what `completeSale()` will
actually charge, because it's the exact same function call. See `SALES.md`
"Live pricing preview".

## Pitfall: Prisma `Decimal` can't cross the Server → Client Component boundary

Every `Decimal` (`GoldRate.ratePerGram`, every money/weight column on
`InventoryItem`, ...) comes back from Prisma as a `Decimal` instance, not a
plain number or string. React's RSC serialization rejects it outright —
passing one as a prop from a Server Component into a `"use client"`
component throws *"Only plain objects can be passed to Client Components
from Server Components. Decimal objects are not supported."* at runtime
(TypeScript does not catch this — the types line up fine).

Two real instances of this bug were caught during Phase 1/2 development
(the Phase 1 dashboard's `<GoldCalculator>`, and Phase 2's `<StockForm>` /
`<BarcodeSelectionGrid>`) precisely because it's a runtime-only failure.
The fix is always the same: convert every `Decimal` to a `string` (via
`.toString()`, or a dedicated mapper like
`toEditableStockItem()` in `inventory-item.service.ts`) *before* the value
crosses into a Client Component, never after. Passing a `Decimal` into
another **Server** Component (e.g. `GoldRateSummary`, `StockHistoryTimeline`,
the print sheets) is fine — the restriction only applies at the
Server → Client boundary. When adding a new client component that takes a
Prisma row as a prop, check this first.
