# Phase 4 Status — Customer CRM + Customer Ledger + Customer Intelligence

Status: **Complete**. Typecheck, lint, unit tests, integration tests,
Playwright end-to-end tests, and a production build all pass with zero
errors and zero warnings as of this writing. Phase 1, 2, and 3 were
re-verified working (all their tests still pass unchanged, and every
existing flow — gold rates, inventory, barcodes, POS checkout, invoices —
was exercised again alongside the new Customer CRM flows) before this
status was written.

## Scope delivered

- **Database** — `Customer` extended with `customerCode`, `firstName`,
  `lastName`, `secondaryPhone`, `address`, `city`, `dateOfBirth`,
  `anniversaryDate`, `gender`, `preferredLanguage`, `customerType`,
  `status`; new entities `CustomerNote`, `CustomerPreference`,
  `CustomerLedgerEntry`, `CustomerPayment`; new enums `CustomerType`,
  `CustomerStatus`, `LedgerTransactionType`; 10 new `AuditAction` values.
  No changes to any Phase 1/2/3 table's existing columns or behavior. See
  `DATABASE.md`.
- **Customer codes** — `ZJC-000001`, a real Postgres autoincrement column
  as the source of truth, mirroring the Phase 2/3 barcode/invoice pattern
  exactly. Never reused, proven unique under concurrency in integration
  tests.
- **Duplicate protection** — the primary `phone` unique constraint is a
  hard block; a shared `secondaryPhone`/`email` surfaces a "Possible
  duplicate customer" dialog with "Use Existing Customer" / "Create New
  Customer Anyway", never a hard block on its own. See `CUSTOMER-CRM.md`.
- **All Customers** — rich search (name/phone/secondary phone/email/
  customer code), filters (type, status, city, spending range, outstanding
  balance, purchase-date range), 6 sort orders, server-side pagination, all
  via one parameterized raw-SQL query.
- **Customer Profile** — header, summary cards, and 8 tabs (Overview,
  Purchases, Invoices, Ledger, Payments, Notes, Preferences, Activity),
  every tab pre-rendered server-side to avoid the Decimal Server→Client
  boundary pitfall. See `CUSTOMER-CRM.md`.
- **Customer financial ledger** — append-only `CustomerLedgerEntry`
  (`SALE`/`PAYMENT`/`REFUND`/`CREDIT_ADJUSTMENT`/`DEBIT_ADJUSTMENT`), the
  sole source of truth for `Customer.outstandingBalance`, written through
  exactly one function (`appendCustomerLedgerEntry`) backed by one atomic
  `UPDATE ... RETURNING` statement — race-free under concurrent writes to
  the same customer with no application-level locking. See
  `CUSTOMER-LEDGER.md`.
- **Receive Customer Payment** — `CASH`/`CARD`/`BANK_TRANSFER`/`OTHER`
  only (never `CREDIT`), validated against outstanding balance unless the
  configurable overpayment setting is enabled, one transaction (validate →
  create payment → ledger entry → balance update), audit-logged after
  commit.
- **Customer lifetime value** — live-computed (never cached) sum of
  non-cancelled sales, correctly excluding fully `RETURNED` sales.
- **VIP system** — configurable spending threshold (`SystemSetting`,
  default Rs. 2,000,000), badge display only, never changes
  `Customer.customerType`.
- **Segmentation** — 7 rule-based segments (New Customer, Regular
  Customer, VIP, High Value, Inactive, Credit Customer, Recent Buyer)
  computed by one centralized pure function, `computeCustomerSegments()`,
  called by every page/analytics function that needs a segment — never
  re-implemented. See `CUSTOMER-SEGMENTS.md`.
- **Inactivity** — configurable window (`SystemSetting`, default 90 days),
  marketing segment only, never auto-deactivates a customer's account
  (`CustomerStatus` is a fully independent field).
- **Preferences** — `CustomerPreference` (1:1): categories, purity, metal,
  price range, contact method, notes — jewelry-business preferences, not
  sensitive profiling.
- **Notes** — multi-entry `CustomerNote`, never silently overwritten; add
  inserts a new row, edit updates that row in place, both audited.
- **Birthday / anniversary** — stored on `Customer`, surfaced via two
  dashboard widgets with year-rollover-aware "next occurrence" logic.
  Display only — no automated WhatsApp/SMS, per the spec.
- **Activity timeline** — reuses the existing `AuditLog` table (direct
  customer-entity matches plus indirect matches via the customer's own
  sale ids) — no parallel "CustomerEvent" table.
- **Customer dashboard summary** — Total, New This Month, Active, VIP,
  Inactive, With Outstanding Balance — every number a real query, no
  placeholders.
- **CRM analytics pages** — `/customers/vip`, `/customers/inactive`,
  `/customers/segments` (with per-segment drill-down), `/customers/ledger`
  (company-wide).
- **CSV export** — `customers:export`-gated, unpaginated (a dedicated
  `exportAllCustomers()`, distinct from the paginated list query),
  audit-logged.
- **CSV/Excel import** — prepared at the service layer
  (`CreateCustomerInput`, `findPossibleDuplicates()`) but has no UI, per
  the spec. See `CUSTOMER-CRM.md`.
- **Permissions** — 8 new keys (`customers:view/create/manage/notes/
  ledger/payment/export/segments`), each independently grantable per the
  spec's per-role matrix, enforced server-side in every Server Action.
- **POS integration** — the existing customer picker now creates customers
  via `firstName`/`lastName`, still never auto-creates a placeholder for a
  walk-in; every credit sale now posts a `SALE` debit and, if anything was
  paid at checkout, a `PAYMENT` credit to the customer's ledger — including
  a fully-paid sale, which nets to zero but still leaves a full audit
  trail.
- **Returns integration (prepared, not wired)** — `LedgerTransactionType`
  already includes `REFUND`/`CREDIT_ADJUSTMENT` for a future phase;
  approving a return does not yet post to the ledger, per the spec's
  explicit deferral. See `CUSTOMER-LEDGER.md` "Returns integration".
- **Reconciliation** — `reconcileCustomerBalance()`/
  `reconcileAllCustomerBalances()` independently verify the cached balance
  against the ledger's own math, reporting a mismatch rather than silently
  correcting it.
- **Tests** — 52 new Vitest tests (across 3 new integration test files)
  plus 4 new Playwright end-to-end tests, for **192** unit/integration and
  **13** end-to-end tests total across all four phases.
- **Documentation** — this file, `CUSTOMER-CRM.md`, `CUSTOMER-LEDGER.md`,
  `CUSTOMER-SEGMENTS.md`, plus updates to `README.md`, `ARCHITECTURE.md`,
  and `DATABASE.md`.

## Files created

Schema: `prisma/migrations/20260816194455_phase4_customer_crm_ledger/`.

Lib: `src/lib/customer-code.ts`, `src/lib/validation/customers.ts`,
`src/lib/actions/action-result.ts`, `src/lib/actions/customers.actions.ts`.

Types: `src/types/customers.ts`.

Services (`src/services/`): `customer-ledger.service.ts`,
`customer-payment.service.ts`, `customer-notes.service.ts`,
`customer-preference.service.ts`, `customer-activity.service.ts`,
`customer-analytics.service.ts`.

Components (`src/components/customers/`): `customer-status-badge.tsx`,
`customer-filters.tsx`, `customer-table.tsx`, `customer-summary-cards.tsx`,
`add-customer-form.tsx`, `edit-customer-form.tsx`,
`customer-profile-tabs.tsx`, `customer-ledger-table.tsx`,
`add-note-form.tsx`, `preferences-form.tsx`, `record-payment-button.tsx`,
`archive-customer-button.tsx`, `segment-customer-table.tsx`,
`export-customers-button.tsx`, `upcoming-dates-widget.tsx`.

Routes (`src/app/(app)/customers/`): `layout.tsx`, `page.tsx` (All
Customers), `add/page.tsx`, `[id]/page.tsx` (Profile), `[id]/edit/page.tsx`,
`ledger/page.tsx`, `vip/page.tsx`, `inactive/page.tsx`, `segments/page.tsx`.

Tests: `tests/customer.service.integration.test.ts`,
`tests/customer-ledger.integration.test.ts`,
`tests/customer-analytics.integration.test.ts`, `e2e/customers.spec.ts`.

Docs: `CUSTOMER-CRM.md`, `CUSTOMER-LEDGER.md`, `CUSTOMER-SEGMENTS.md`,
`PHASE-4-STATUS.md`.

## Files modified

- `prisma/schema.prisma`, `prisma/seed.ts` — new `Customer` fields, new
  entities/enums, 8 new permission catalog entries, 3 new `SystemSetting`
  seed values (VIP threshold, inactivity days, overpayment allowed).
- `src/lib/auth/permissions.ts` — 8 new `customers:*` permission keys.
- `src/lib/settings-keys.ts` — 3 new settings keys.
- `src/lib/validation/sales.ts` — the POS quick-add customer schema
  renamed `createCustomerSchema` → `quickCreateCustomerSchema` with a
  `firstName`/`lastName` shape (was `name`).
- `src/lib/actions/sales.actions.ts` — `createCustomerAction` now accepts
  `firstName`/`lastName` and returns a full `CustomerSearchResult`
  (previously just `{ id }`); `ActionResult` now imported from the new
  shared `action-result.ts` instead of being redefined locally.
- `src/services/customer.service.ts` — extended extensively: customer-code
  formatting, duplicate detection, full profile CRUD, status/type changes,
  the raw-SQL `listCustomers()`/`exportAllCustomers()`, and the
  `adjustCustomerOutstandingBalanceInTx()` primitive the ledger service
  calls exclusively. Every Phase 3 caller (POS's customer picker,
  `sale-transaction.service.ts`) still works unchanged.
- `src/services/sale-transaction.service.ts` — the old direct
  `increaseCustomerOutstandingBalance()` call replaced with two
  `appendCustomerLedgerEntry()` calls (a `SALE` debit for the full grand
  total, plus a `PAYMENT` credit for whatever was paid at checkout) so
  every credit sale now posts to the real ledger instead of just
  incrementing a bare column.
- `src/components/pos/customer-picker.tsx` — the quick-add dialog now
  collects `firstName`/`lastName` and uses the action's returned
  `CustomerSearchResult` directly instead of reconstructing one manually.
- `src/config/nav.ts` — Customers promoted from "coming soon" to a real
  module with 6 sub-nav tabs.
- `src/app/(app)/customers/page.tsx` — replaced the Phase 1-3 "coming in
  next phase" placeholder with the real All Customers page.
- `src/app/(app)/dashboard/page.tsx` — added the Customers summary section
  and the Upcoming Birthdays/Anniversaries widget row; removed the
  "Customers"/"Receivables" future-placeholder cards they replace.
- `tests/authorization.integration.test.ts` — added a new test block
  covering all 8 `customers:*` permissions (no-grant / partial-grant /
  OWNER-bypass / ADMIN-seeded).
- `tests/sale-transaction.service.integration.test.ts` — updated a
  `createCustomer()` fixture call for the new `firstName`-based input
  shape.

## Database migrations

`20260816194455_phase4_customer_crm_ledger` — extends `customers`; adds
`customer_notes`, `customer_preferences`, `customer_ledger_entries`,
`customer_payments`; adds `CustomerType`, `CustomerStatus`,
`LedgerTransactionType` enums; extends `AuditAction`. Applied cleanly on
top of the existing Phase 1+2+3 database with zero data loss — verified by
re-running the full Phase 1, 2, and 3 test suites and e2e flows afterward,
and by inspecting `_prisma_migrations` and `\d customers` directly (the
interactive `prisma migrate dev` CLI hung in this non-interactive
environment after applying the migration successfully; recovered by
running `prisma generate` directly with no data loss — see commit history
for detail).

## CRM features completed

Customer CRUD with `ZJC-NNNNNN` codes, configurable `customerType`/
`status`, duplicate-customer protection (hard block on primary phone, soft
warning dialog on secondary phone/email), All Customers list with full
search/filter/sort/pagination, the 8-tab Customer Profile page, multi-entry
notes, preferences, birthday/anniversary reminders, CSV export, and the
prepared-but-unexposed import architecture.

## Customer ledger completed

Append-only `CustomerLedgerEntry`, the `appendCustomerLedgerEntry()`
primitive as the sole write path to `Customer.outstandingBalance`, the
company-wide and per-customer ledger views, and reconciliation
(`reconcileCustomerBalance()`/`reconcileAllCustomerBalances()`) that
reports mismatches rather than silently correcting them. The spec's worked
example (500,000 sale, 400,000 paid, 100,000 credit → balance 100,000, then
a 100,000 payment → balance 0) is a dedicated integration test.

## Payment functionality completed

`recordCustomerPayment()`: amount validation, `CREDIT`-method rejection,
overpayment rejection (configurable), one atomic transaction, post-commit
audit log. Proven under concurrency: 5 simultaneous ledger entries for one
customer produce a correct running balance with no lost update.

## Customer segmentation completed

`computeCustomerSegments()` — the single, centralized, pure rule set for
all 7 segments — plus the configurable VIP threshold and inactivity
window, the VIP-badge-vs-`customerType` independence, and the
`CustomerStatus.INACTIVE`-vs-Inactive-segment independence, all covered
individually in `tests/customer-analytics.integration.test.ts`.

## POS integration completed

The customer picker's quick-add flow now collects `firstName`/`lastName`;
every sale associated with a customer posts to the ledger inside the same
transaction as the sale; walk-in sales still never create a placeholder
`Customer` row (verified directly via `sale.customer === null`, not a
global count, to avoid cross-test-file flakiness against the shared dev
database).

## Tests passed

```
Vitest:      192 passed, 0 failed  (17 files — 140 Phase 1-3 + 52 Phase 4)
Playwright:    13 passed, 0 failed  (9 Phase 1-3 + 4 Phase 4, real browser, real Postgres)
TypeScript:    0 errors  (tsc --noEmit)
ESLint:        0 errors, 0 warnings
```

Covers all 20 scenarios requested plus the critical worked-example test
and the reconciliation requirement: customer creation (with audit log),
customer-code uniqueness under concurrency, duplicate detection (hard
phone block + soft secondary-phone/email warning), search/filter/sort/
pagination, profile fetch, edit/archive/status/type changes (each
audit-logged), the critical ledger worked example, ledger debit-always-
equals-grand-total behavior, payment recording (full/partial/multiple/
zero-rejection/negative-rejection/CREDIT-rejection/overpayment-rejection),
reconciliation (matching + deliberately-induced-mismatch detection),
ledger concurrency (5 simultaneous entries), sale-customer association
(and walk-in non-creation), lifetime value (including a fully-returned-sale
exclusion case), VIP threshold calculation (customerType unaffected),
inactive segmentation (including never-purchased-but-old and
brand-new-with-zero-purchases edge cases), credit-customer segmentation,
and authorization across all 8 `customers:*` permissions
(no-grant/partial-grant/OWNER-bypass/ADMIN-seeded).

## Build status

`npm run build` succeeds cleanly (Turbopack production build, 34 routes,
including all 8 new `/customers/*` routes). Manually verified end-to-end in
a real browser via Playwright against a real Postgres database: add a
customer → possible-duplicate dialog on a repeated phone → sell to that
customer on full credit through POS → the sale appears on the customer's
Ledger tab → recording a payment on the Payments tab settles the balance to
Rs. 0 → a high-value sale surfaces the customer on the VIP page → Inactive,
Segments (with drill-down), and company Ledger pages all render → the
dashboard shows live Customer/Birthday/Anniversary widgets → CSV export
downloads a real file.

No new class of bug was found beyond one real accessibility issue caught
during this pass and fixed immediately: several Phase 4 form components
(`add-customer-form.tsx`, `edit-customer-form.tsx`,
`record-payment-button.tsx`, `preferences-form.tsx`) rendered `<Label>` as
a visual sibling of its `<Input>`/`<Select>` with no `htmlFor`/`id`
association, so neither `getByLabel()` nor a screen reader could actually
connect them — fixed by threading an explicit `id` through every field.

## Known issues

None outstanding beyond what's explicitly deferred by the spec (see
"Known limitations" in `README.md`, and this phase's own "DO NOT BUILD
YET" list): WhatsApp/SMS automation, AI marketing, AI customer prediction,
an AI assistant, loyalty points, a referral system, advanced marketing
campaigns, AI image generation, and Karigar accounting. Returns are not yet
wired to the customer ledger (`REFUND`/`CREDIT_ADJUSTMENT` entry types
exist in the schema but nothing posts them yet). CSV/Excel import has a
prepared service-layer shape but no UI. Only `OWNER` and `ADMIN` roles are
seeded — every `customers:*` permission is scoped exactly per the spec's
role matrix, but there's no role-management UI yet to create
`MANAGER`/`CASHIER`/`SALESPERSON`/`ACCOUNTANT`/`MARKETING_MANAGER` and
grant them individually.

## Exact commands to run

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
npm run db:migrate          # applies the Phase 4 migration on top of Phase 1-3
npm run db:seed             # re-seeds permissions/settings (idempotent)
npm run dev
```

Then open `http://localhost:3000`, sign in with the credentials printed by
`db:seed`, and go to **Customers** in the sidebar — add a customer, then
sell to them from **POS** to see the ledger and segments populate.

## Recommended Phase 5

**Returns/Refunds wired to the customer ledger, plus Karigar accounting.**
The `LedgerTransactionType` enum already carries `REFUND` and
`CREDIT_ADJUSTMENT` specifically so approving a return can post a proper
ledger credit without a schema change — building that wiring next closes
the one deliberate gap this phase left open, and is a natural, low-risk
extension of `approveReturn()` (Phase 3) using the exact
`appendCustomerLedgerEntry()` primitive this phase already built and
tested. Karigar accounting (named in the original long-term vision, and
explicitly out of scope for Phase 4) is the other clear next slice — it has
no dependency on WhatsApp/AI work and can be built independently. Do not
start WhatsApp automation, SMS automation, AI marketing, AI customer
prediction, the AI assistant, loyalty/referral programs, or AI image
generation in this phase — those remain later scope per the long-term
vision.
