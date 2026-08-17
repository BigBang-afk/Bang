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
- `karigar.service.ts` *(Phase 5)* — Karigar identity CRUD, ZJK-numbered
  codes, duplicate-phone detection, search/list/filter, status transitions
  (never a hard delete). Mirrors `customer.service.ts`'s shape closely on
  purpose. See `KARIGAR-SYSTEM.md`.
- `supplier.service.ts` *(Phase 5)* — the same shape again for Supplier
  identity, ZJS-numbered codes, plus `getSupplierPurchaseSummary()` (a
  snapshot rollup from `Purchase`, deliberately not including a live
  payable figure — that comes from `party-cash-ledger.service.ts`, the same
  split Phase 3/4 already has between `Sale.balanceAmount` and
  `Customer.outstandingBalance`). See `SUPPLIER-SYSTEM.md`.
- `gold-ledger.service.ts` *(Phase 5)* — `appendGoldLedgerEntry(tx, input)`,
  the single write path for both `PartyGoldBalance` and `GoldLedgerEntry`,
  shared by karigars and suppliers via a polymorphic `(partyType, partyId)`
  pair; also `transferGoldBetweenParties()`, `recordGoldAdjustment()`, and
  the purity-separated position/summary read models. See "The gold ledger
  primitive" below and `GOLD-LEDGER.md`.
- `karigar-job.service.ts` *(Phase 5)* — the job-work cycle:
  `giveGoldToKarigar()` / `receiveGoldFromKarigar()`, wastage-difference
  classification against a configurable tolerance, and
  `classifyGoldJobDifference()` (an explicit human annotation that never
  mutates the stored weights). Composes `gold-ledger.service.ts`, never
  duplicates its balance logic. See `KARIGAR-SYSTEM.md` "Wastage
  reconciliation".
- `party-cash-ledger.service.ts` *(Phase 5)* — `appendPartyCashLedgerEntry(tx,
  input)`, the karigar/supplier equivalent of `customer-ledger.service.ts`,
  same polymorphic-party shape as the gold ledger but tracking rupees, never
  grams. `getPartyCashPosition()` is the only place the raw signed balance
  is turned into a `{ payable, receivable }` pair — nothing downstream ever
  reads the raw number. See "The party cash ledger primitive" below and
  `CASH-MANAGEMENT.md`.
- `cash-transaction.service.ts` *(Phase 5)* — the company's physical
  cash-in-hand book (`recordCashTransactionInTx()`), structurally separate
  from the party cash ledger above. `getCashBalance()` computes live
  (`opening + SUM(IN) - SUM(OUT)`) rather than caching, since it's cheap to
  aggregate and must never drift. See "The company cash book vs. the party
  cash ledger" below.
- `purchase.service.ts` *(Phase 5)* — `createPurchase()`, the purchase
  transaction engine: validates every line item up front (before opening
  any transaction, so a mid-list failure creates zero rows), reuses the
  Phase 1 `calculateGoldValue()` engine per item, then in one `$transaction`
  writes `Purchase`/`PurchaseItem`/`PurchasePayment`, optionally composes
  `createInventoryItemInTx()` for push-to-inventory, records each payment to
  the company cash book, and posts the supplier's cash ledger. See "Composable
  transactional primitives" below and `PURCHASE-SYSTEM.md`.
- `reconciliation.service.ts` *(Phase 5)* — `runGoldReconciliation()` /
  `runCashReconciliation()`: compute the live system figure, compare
  against a user-entered physical count, classify `MATCHED` or
  `RECONCILIATION_REQUIRED`, and persist the comparison. Deliberately never
  calls any adjustment function itself — applying a fix is always a
  separate, later, explicit action. See `RECONCILIATION.md`.
- `karigar-cash.service.ts` *(Phase 5)* — `recordKarigarCashTransaction()`,
  a thin composition of `party-cash-ledger.service.ts` +
  `cash-transaction.service.ts` for the "Pay/Receive Cash" karigar workflow.
- `supplier-payment.service.ts` *(Phase 5)* — the same composition for
  supplier payments against a purchase payable, plus
  `listPurchasePaymentsForSupplier()` for the Supplier profile's Payments
  tab.
- `financial-settings.service.ts` *(Phase 6)* — reads the accounting-related
  `SystemSetting` keys fresh on every call: `getBusinessTimezone()`,
  `getCurrentBusinessDate()`, `getReceivableAgingBucketDays()`,
  `getFlagUnpaidBalancesOnClosing()`. Same "settings as data, never cached"
  pattern as every prior phase.
- `expense-category.service.ts` *(Phase 6)* — CRUD + enable/disable for
  `ExpenseCategory`. Categories are data, never a hardcoded enum, so
  OWNER/ADMIN can add one without a code change — see `EXPENSE-SYSTEM.md`.
- `expense.service.ts` *(Phase 6)* — `createExpense()`, `voidExpense()`,
  `listExpenses()`, `getExpenseById()`. `createExpense()` atomically writes
  an `Expense` row and a `CashTransaction` (`EXPENSE_PAID`, `OUT`) in one
  `$transaction`; `voidExpense()` never deletes or edits the original row —
  see "The void/reversal correction pattern" below.
- `income.service.ts` *(Phase 6)* — mirrors `expense.service.ts` exactly for
  standalone (non-POS) income: `createIncome()`/`voidIncome()` pairs an
  `Income` row with a `CashTransaction` (`INCOME_RECEIVED`, `IN`). Never
  duplicates a POS sale — `Sale` and `Income` are structurally separate
  tables with no overlap.
- `historical-balance.service.ts` *(Phase 6)* — reconstructs "balance as of
  a past instant" for ledgers that only cache a *live* running balance
  (`CustomerLedgerEntry`, `PartyCashLedgerEntry`, `GoldLedgerEntry`,
  `CashTransaction`), via a raw `DISTINCT ON` SQL query. Extracted out of
  `daily-closing.service.ts` once `financial-reports.service.ts` needed the
  same technique — see "Historical balance reconstruction" below.
- `daily-closing.service.ts` *(Phase 6)* — builds every section of the
  Daily Closing screen (Sales/Payments/Expenses/Cash/Gold/Receivables/
  Payables), computes the daily cash formula, the unresolved-issues
  checklist, and drives the OPEN → PENDING_REVIEW → CLOSED → REOPENED
  workflow. See `DAILY-CLOSING.md`.
- `profit-loss.service.ts` *(Phase 6)* — `getProfitAndLoss(preset, custom?)`:
  Revenue → COGS → Gross Profit → Operating Expenses → Net Profit, entirely
  from existing `Sale`/`SaleItem`/`Return`/`Expense`/`Income` rows. COGS
  always reads the sold item's own recorded `totalCost` snapshot, never
  today's gold rate. See `PROFIT-LOSS.md`.
- `financial-reports.service.ts` *(Phase 6)* — the report suite: Sales,
  Purchase, Expense, Cash, Gold (purity-separated, never summed), Receivable
  Aging, Payable, Gold Obligation, Inventory Valuation, and a separately
  labeled Current Market Valuation. Every report aggregates server-side and
  accepts a resolved date range — see `FINANCIAL-REPORTS.md`.
- `financial-reconciliation.service.ts` *(Phase 6)* — independent
  cross-book integrity checks: `reconcileSales()`, `reconcileCustomerLedger()`,
  `reconcileSupplierLedger()`, `reconcileKarigarLedger()`, `reconcileCash()`,
  `reconcileGold()`, `reconcileInventory()`, and `runFullFinancialReconciliation()`.
  Structurally distinct from Phase 5's `reconciliation.service.ts` — see "Two
  kinds of reconciliation" below.
- `financial-dashboard.service.ts` *(Phase 6)* — `getFinancialDashboardSummary()`,
  `getDailyTrend()`, `getSalesByCategoryThisMonth()`: the real-data-only
  aggregates behind the Financial Dashboard's cards and charts.

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
- `(app)/karigars/` *(Phase 5)* — its own nested `layout.tsx` requires
  `karigars:view` once and renders the All Karigars/Add Karigar/Karigar
  Ledger/Gold With Karigar/Cash With Karigar sub-nav tabs. `[id]/page.tsx`
  is the profile page (Overview/Gold Ledger/Cash Ledger/Jobs/Transactions/
  Notes tabs, same server-prerendered-tabs pattern as the Customer profile).
  See `KARIGAR-SYSTEM.md`.
- `(app)/suppliers/` *(Phase 5)* — mirrors `karigars/` exactly: All
  Suppliers/Add Supplier/Ledger sub-nav, `[id]/page.tsx` profile
  (Overview/Purchases/Ledger/Gold/Payments/Notes tabs). See
  `SUPPLIER-SYSTEM.md`.
- `(app)/purchases/` *(Phase 5)* — `page.tsx` is New Purchase (the primary
  action lives at the route root, the same pattern POS uses for New Sale);
  `history/page.tsx` is Purchase History; `[id]/page.tsx` is the purchase
  detail view. See `PURCHASE-SYSTEM.md`.
- `(app)/gold-ledger/` *(Phase 5)* — company-wide Gold Transactions, Gold
  With Karigars, Gold With Suppliers, and Gold Reconciliation sub-nav.
- `(app)/cash-management/` *(Phase 5)* — Cash Transactions (the physical
  cash book), Cash Payable, Cash Receivable, and Cash Reconciliation
  sub-nav.
- `(app)/party-ledger/` *(Phase 5)* — a single combined page satisfying both
  the spec's "Party Ledger" nav item and its "Reporting Foundation"
  requirement (Karigar Gold/Cash Position, Supplier Payables/Gold Position,
  Cash Summary, Purchase Summary, Gold Reconciliation) — deliberately not a
  separate `/reports` module, since `/reports` remains an explicit
  "coming in next phase" placeholder, same as every prior phase.
- `(app)/accounting/` *(Phase 6)* — its own nested `layout.tsx` requires
  `accounting:reports:view` once and renders the 13-item Accounting sub-nav
  exactly as specified: Financial Dashboard (`page.tsx`), Expenses, Income,
  Daily Closing, Profit & Loss, Cash Report, Gold Report, Receivables,
  Payables, Sales Report, Purchase Report, Inventory Valuation, Financial
  Reconciliation. Every report page is a Server Component that reads
  `searchParams` for the date-range preset/custom range, calls the matching
  `financial-reports.service.ts`/`profit-loss.service.ts` function
  server-side, and renders an `<ExportCsvButton>` — no report ever loads
  every underlying transaction into the browser. See `ACCOUNTING.md`,
  `DAILY-CLOSING.md`, `PROFIT-LOSS.md`, and `FINANCIAL-REPORTS.md`.

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
- Phase 5 adds 13 permissions across six namespaces —
  `karigars:view/manage/gold/cash`, `suppliers:view/manage`,
  `purchases:view/create`, `gold_ledger:view/reconcile`,
  `cash:view/manage/reconcile` — matching the spec's per-role matrix
  (ACCOUNTANT owns ledgers/payments/reconciliation; INVENTORY_MANAGER only
  the inventory-related purchase ops; CASHIER only cash/payment ops;
  SALESPERSON gets none of them; KARIGAR_MANAGER owns karigar/job records).
  Same pattern as Phase 4: only `OWNER`/`ADMIN` are seeded with grants
  today, the keys already encode every future role's boundary.
- Phase 6 adds 9 `accounting:*` permissions —
  `accounting:reports:view`, `accounting:expenses:view/create/manage`,
  `accounting:income:manage`, `accounting:daily_closing`,
  `accounting:daily_closing:reopen`, `accounting:reconcile`,
  `accounting:export` — matching the spec's role matrix (ACCOUNTANT gets
  full financial reports/expenses/payments/reconciliation; MANAGER gets
  view + daily closing + limited adjustments; CASHIER gets daily closing +
  cash transactions + limited expense access; SALESPERSON gets none of
  them unless explicitly granted). `accounting:daily_closing:reopen` is
  intentionally its own key, separate from `accounting:daily_closing`,
  because the spec restricts reopening a closed day to OWNER/an explicitly
  authorized manager — a strictly narrower audience than who can *submit*
  a closing. Same pattern as every prior phase: only `OWNER`/`ADMIN` are
  seeded with grants today.

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

## Settings as data — wastage tolerance & cash opening balance *(Phase 5)*

Two more `SystemSetting` keys, same pattern:
`karigar.wastage_tolerance_grams` (default `"0.100"`) and
`cash.opening_balance` (default `"0"`). The tolerance is read fresh by
`karigar-job.service.ts` at receive-time but then **snapshotted** onto the
`KarigarGoldJob` row (`toleranceGramsSnapshot`) — the one deliberate
exception to "always read fresh": a later change to the setting must never
retroactively reclassify a job that was already received. The opening
balance is read fresh by `cash-transaction.service.ts`'s
`getCashBalance()` on every call, never cached.

## Settings as data — business timezone, aging, unpaid-balance flag *(Phase 6)*

Three more `SystemSetting` keys, same pattern: `business.timezone` (default
`"Asia/Karachi"`), `accounting.receivable_aging_bucket_days` (default
`"30"`, defining the width of each aging bucket), and
`accounting.flag_unpaid_balances_on_closing` (default `"false"`).
`financial-settings.service.ts` reads all three fresh on every call —
`daily-closing.service.ts` and `profit-loss.service.ts`'s date-preset
resolution never assume the browser's or server's local calendar day, they
resolve "today" in the configured business timezone instead (see
`resolveBusinessDateInTimezone()` in `src/lib/business-date.ts`, additive to
Phase 1's unchanged `toBusinessDate()`/`getTodayBusinessDate()`).

## The void/reversal correction pattern *(Phase 6)*

Expense and Income rows are financial history, and the spec is explicit:
never silently modify a historical financial transaction. `voidExpense()`/
`voidIncome()` therefore never `UPDATE` or `DELETE` the original row's
amount/date/category — they flip `status` to `VOIDED` and record
`voidReason`/`voidedById`/`voidedAt`, **and**, in the same `$transaction`,
write a compensating `CashTransaction` (`CASH_ADJUSTMENT`, opposite
direction, same amount, `referenceType`/`referenceId` pointing back at the
voided row) so the physical cash book is never left wrong by a void. A
correction is then a *separate*, later `createExpense()`/`createIncome()`
call with `reversalOfId` set to the voided row's id, which the read side
surfaces as `reversalOf`/`reversedBy` — producing a full auditable chain:
original `CREATED` → `VOIDED` (with its own cash reversal) → new corrected
`CREATED` referencing the old one. Nothing is ever deleted; nothing is ever
edited in place.

## Historical balance reconstruction *(Phase 6)*

None of `CustomerLedgerEntry`, `PartyCashLedgerEntry`, `GoldLedgerEntry`, or
`CashTransaction` cache a per-date snapshot — each row only carries the
*live* running balance at the moment it was written. Daily Closing's
opening receivable/payable/gold figures and the Cash section's opening cash
need "what was the balance at instant X in the past", which isn't a value
any table stores directly. `historical-balance.service.ts` reconstructs it
with a raw SQL `DISTINCT ON (party/customer key) ... ORDER BY key,
"createdAt" DESC WHERE "createdAt" < $cutoff`, summing each party's/
customer's own latest entry strictly before the cutoff. This was originally
written privately inside `daily-closing.service.ts`, then extracted to its
own file once `financial-reports.service.ts` needed the identical
technique for report opening balances — one implementation, two callers.

## Two kinds of reconciliation *(Phase 5 vs. Phase 6)*

The codebase now has two structurally different things both called
"reconciliation," and they must not be conflated:

- **Phase 5's `reconciliation.service.ts`** — *system-vs-physical-count*
  reconciliation. "Does the ledger's live figure match what a human
  actually counted in the till/vault?" Always requires a user-entered
  physical count as input.
- **Phase 6's `financial-reconciliation.service.ts`** — *cross-book*
  integrity reconciliation. "Does this cached/derived figure match an
  independent recomputation from the ledger rows that are supposed to
  justify it?" No physical count involved — it catches a code/data bug
  (two numbers that were supposed to always agree, but don't), not a
  physical-count mismatch. For example, `reconcileCustomerLedger()`
  recomputes each customer's outstanding balance from their
  `CustomerLedgerEntry` rows and compares it against the cached
  `Customer.outstandingBalance` column.

Both follow the identical **flag, never auto-correct** policy — every
`reconcile*()` function returns `{ status, expected, actual, difference,
errors }` and stops there; applying a fix is always a separate, explicit,
later action a human takes. See `RECONCILIATION.md` for both, in their own
sections.

## The Server Action / Client Component boundary — bare references vs. closures *(Phase 6)*

Next.js allows a Server Component to pass a **bare, exported `"use server"`
function reference** as a prop into a Client Component — it gets serialized
as an action reference the client can invoke. It does **not** allow an
ad-hoc closure that merely *calls* one internally
(`action={() => someServerAction(x)}`) — that throws *"Functions cannot be
passed directly to Client Components unless explicitly exposed with 'use
server'"* at runtime (again, like the `Decimal`-boundary pitfall above,
TypeScript does not catch this).

Two real instances were caught during Phase 6 manual/Playwright testing:
`ExportCsvButton` and `VoidFinancialEntryDialog` both originally took a
closure prop built by the Server Component that rendered them. The fix in
both cases was the same shape: redesign the component to accept the **bare**
action function plus separate, serializable data props (`actionInput` for
the export button; `entryId`/`idField` for the void dialog), and build the
actual call arguments **inside** the `"use client"` component instead of in
the Server Component. When adding a new client component that needs to
trigger a Server Action with per-instance arguments, pass the bare action
and the arguments as separate props — never a closure.

## Test infrastructure — `fileParallelism: false` *(Phase 6)*

Every integration test in this repository shares one real, mutable Postgres
database with no per-test transaction rollback (see "Testing" below).
Vitest's default parallel-file execution let two files' concurrent writes
land inside each other's aggregate before/after read windows — harmless at
Phase 1-5's scale, but Phase 6's system-wide aggregate reads
(`getProfitAndLoss`, `getSalesReport`, `getCashReport`,
`runFullFinancialReconciliation`) made this 5-8 flaky failures per full-suite
run, well past what any prior phase's single "accepted flake" precedent
covered. `vitest.config.mts` now sets `fileParallelism: false`, serializing
test *file* execution (tests within a file still interleave normally). This
is a genuine root-cause fix, not a per-test workaround — it benefits every
phase's integration tests, not just Phase 6's — verified via repeated
full-suite runs going from 5-8 failures down to 0-1 (the remaining 1, when
it occurs, is the pre-existing Phase 4 customer-search flake, unrelated to
concurrency). Runtime cost: the full suite still finishes in well under a
minute.

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

## The gold ledger primitive *(Phase 5)*

`appendGoldLedgerEntry(tx, input)` (`gold-ledger.service.ts`) is the
**only** code allowed to change a `PartyGoldBalance` row. Same shape as the
Phase 4 customer-ledger primitive: one atomic `INSERT ... ON CONFLICT
(partyType, partyId, purity) DO UPDATE ... RETURNING balance`, then the
`GoldLedgerEntry` row is created with the exact balance the upsert just
returned. One unified sign convention covers both party types without any
`if (partyType === "KARIGAR")` branching anywhere: `debit`
(`GOLD_GIVEN`/`GOLD_RETURNED`) moves gold toward the party and raises their
balance; `credit` (`GOLD_RECEIVED`) moves gold back to the business and
lowers it. `balanceAfter > 0` → the party `HOLDS_GOLD` (the business is
owed it back); `balanceAfter < 0` → the party `OWES_GOLD` (the business
currently holds gold, or value, that belongs to the party). This is why
giving raw gold to a karigar and receiving raw gold from a supplier on
consignment both work correctly through the exact same function despite
being conceptually opposite flows — see `GOLD-LEDGER.md` for the worked
examples that verify both directions. `GOLD_ADJUSTMENT` is the one
transaction type that requires the caller to state `direction` explicitly,
since there's no natural default for a manual correction.

## The party cash ledger primitive *(Phase 5)*

`appendPartyCashLedgerEntry(tx, input)` (`party-cash-ledger.service.ts`)
mirrors the gold ledger primitive exactly, but for rupees: an atomic
upsert against `PartyCashBalance` (unique on `partyType, partyId`), then a
`PartyCashLedgerEntry` row with the returned balance. `debit`
(`PURCHASE`/`CASH_RECEIVED`) moves the balance toward payable; `credit`
(`CASH_PAID`/`PAYMENT`) moves it toward receivable. The raw signed number
is never returned to a caller outside this file — `getPartyCashPosition()`
is the one function that turns it into `{ payable, receivable }`, so a UI
component can never accidentally render "-50,000" instead of "Receivable:
50,000". Verified against the spec's exact worked example (Purchase
500,000 debit → Payment 400,000 credit → Payable 100,000 → Payment 100,000
→ Payable 0) in `tests/party-cash-ledger.integration.test.ts`.

## The company cash book vs. the party cash ledger *(Phase 5)*

Phase 5 has two structurally separate ledgers that are easy to conflate
because both are "cash":

- **`PartyCashLedgerEntry`** answers "who owes whom, and how much" — a
  karigar/supplier-scoped payable/receivable, exactly like
  `CustomerLedgerEntry` answers it for customers.
- **`CashTransaction`** answers "how much physical cash is in the drawer" —
  a single company-wide book, unscoped to any party.

A single business event can write to both in the same transaction. A
purchase payment, for example, calls `appendPartyCashLedgerEntry()` (the
supplier now owes less) **and** `recordCashTransactionInTx()` (cash
physically left the drawer) inside `purchase.service.ts`'s one
`$transaction`. Phase 3/4's `sale-transaction.service.ts` and
`customer-payment.service.ts` were extended in Phase 5 the same way — a
non-CREDIT sale payment or customer payment now also calls
`recordCashTransactionInTx()` (`SALE_PAYMENT`/`CUSTOMER_PAYMENT`, `IN`) so
the company cash book reflects every cash-in event across every module,
not just Phase 5's own. Neither addition changes any Phase 3/4 balance or
behavior — it's a pure additional write inside an existing transaction.

## Composable transactional primitives — `createInventoryItemInTx` *(Phase 5)*

Prisma does not support nesting one `prisma.$transaction()` call inside
another. `purchase.service.ts`'s `createPurchase()` needs to create an
`InventoryItem` (with its `Product`/`Barcode`/`StockMovement` rows) as one
step inside its *own* `$transaction`, so it can't call the existing
`createInventoryItem()` from `inventory-item.service.ts`, which always
opens its own top-level transaction. The fix generalizes as a pattern
worth reusing whenever a future module needs to compose an existing
transactional service function into a larger transaction: the transactional
body was extracted into `createInventoryItemInTx(tx, input, userId)` — a
function that accepts a `tx` (Prisma transaction client) instead of opening
its own — and the audit-log writes (which must always happen *after*
commit) were extracted into a separate `writeInventoryItemCreatedAuditLogs()`
helper. `createInventoryItem()` itself became a thin wrapper:
`prisma.$transaction((tx) => createInventoryItemInTx(tx, input, userId))`
followed by `writeInventoryItemCreatedAuditLogs()`. Both extracted pieces
are exported specifically for `purchase.service.ts` to reuse, so a
purchase's inventory push-through gets full transactional atomicity with
`Purchase`/`PurchaseItem`/`PurchasePayment` while still going through the
exact same inventory-creation logic Phase 2 built — nothing about Phase
2/3's own `createInventoryItem()` behavior changed; this was verified by a
full Phase 1-4 regression run after the refactor.

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
