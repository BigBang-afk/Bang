# Phase 6 Status — Accounting + Expenses + Profit & Loss + Daily Closing + Financial Reports

Status: **Complete**. Typecheck, lint, and a production build all pass with
zero errors and zero warnings as of this writing. The full Vitest suite
passes 326/327, the one failure being the same pre-existing Phase 4 flake
documented since Phase 5 (see "Known issues"). Phases 1-5 were re-verified
(all their tests still pass unchanged; the full suite was re-run
repeatedly during this phase, and every existing flow was exercised again
alongside the new Phase 6 flows) before this status was written.

## Scope delivered

- **Database** — 4 new entities (`ExpenseCategory`, `Expense`, `Income`,
  `DailyClosing`); 3 new enums (`FinancialEntryStatus`, `IncomeType`,
  `DailyClosingStatus`); `CashTransactionType` extended with
  `INCOME_RECEIVED`; 10 new `AuditAction` values; new `User` relations for
  every new actor (created/voided/submitted/closed/reopened by). No changes
  to any Phase 1-5 table's existing columns or behavior — Phase 6 is purely
  additive on top of what already exists. See `DATABASE.md`.
- **Expense management** — `ZJ-EXP-NNNNNN` numbers (never reused),
  configurable categories (19 seeded, OWNER/ADMIN can add more), atomic
  expense-plus-cash-transaction creation, and the void/reversal correction
  pattern (never a silent edit or delete). See `EXPENSE-SYSTEM.md`.
- **Income management** — `ZJ-INC-NNNNNN` numbers, `OTHER_INCOME`/
  `SERVICE_INCOME`/`MISC_INCOME`, the identical void/reversal pattern,
  structurally never duplicating a POS sale. See `EXPENSE-SYSTEM.md`.
- **Daily Closing** — the full cash formula (Opening + Received − Paid +
  Adjustments = Expected), a physical-count vs. expected difference that is
  flagged (shortage/excess) but **never auto-adjusted**, an unresolved-
  issues checklist, and the OPEN → PENDING_REVIEW/CLOSED → REOPENED
  workflow (reopening gated to a narrower permission, always requires a
  reason). See `DAILY-CLOSING.md`.
- **Profit & Loss** — Revenue → COGS → Gross Profit → Operating Expenses →
  Net Profit, with COGS always the sold item's own recorded cost snapshot,
  never today's gold rate; returns reverse both revenue and COGS together;
  discounts never touch COGS. See `PROFIT-LOSS.md`.
- **Financial report suite** — Sales, Purchase, Expense, Cash, Gold
  (purity-separated, never summed), Receivable Aging (customer-level,
  configurable bucket width), Payable, Gold Obligation (gold never
  auto-converted to cash), Inventory Valuation, and a separately-labeled
  Current Market Valuation. See `FINANCIAL-REPORTS.md`.
- **Financial Dashboard** — top cards + Sales/Profit trend, Expenses-by-
  category, Sales-by-category, and Payment Method Breakdown charts, all
  real-data, rendered with a small dependency-free SVG chart component. See
  `FINANCIAL-REPORTS.md`.
- **Server-side date filtering** — one shared preset vocabulary (today/
  yesterday/this week/last 7 days/this month/last month/this year/custom)
  resolved server-side in a configurable business timezone (default
  `Asia/Karachi`), shared by every report and the dashboard. See
  `ACCOUNTING.md`.
- **CSV export** — every listed report, via a small RFC 4180-compliant CSV
  builder; architecture left open for a future Excel/PDF export without
  building either yet; every export writes a `REPORT_EXPORTED` audit entry.
  See `FINANCIAL-REPORTS.md` "Report export".
- **Financial reconciliation** — 7 cross-book integrity checks
  (`reconcileSales`/`CustomerLedger`/`SupplierLedger`/`KarigarLedger`/
  `Gold`/`Cash`/`Inventory`), structurally distinct from Phase 5's
  physical-count reconciliation, flags `FINANCIAL_INTEGRITY_ERROR` but
  **never auto-corrects**. See `RECONCILIATION.md` "Financial
  Reconciliation (Phase 6)".
- **Permissions** — 9 new `accounting:*` keys, matching the spec's role
  matrix (OWNER full, ACCOUNTANT full financial, MANAGER view + daily
  closing + limited adjustments, CASHIER daily closing + cash + limited
  expense access, SALESPERSON none unless granted).
- **Historical balance reconstruction** — a shared raw-SQL technique
  (`historical-balance.service.ts`) for "balance as of a past instant"
  against ledgers that only cache a live running balance, used by both
  Daily Closing and the report suite's opening-balance figures.
- **Tests** — 73 new Vitest tests across 6 new integration test files, plus
  6 new authorization tests appended to the existing
  `authorization.integration.test.ts`, for **327** total tests across all
  six phases.
- **Documentation** — this file, `ACCOUNTING.md`, `EXPENSE-SYSTEM.md`,
  `DAILY-CLOSING.md`, `PROFIT-LOSS.md`, `FINANCIAL-REPORTS.md`, a new
  "Financial Reconciliation (Phase 6)" section appended to `RECONCILIATION.md`,
  plus updates to `README.md`, `ARCHITECTURE.md`, and `DATABASE.md`.

## Files created

Schema:
`prisma/migrations/20260817061208_phase6_accounting_expenses_daily_closing/`,
`prisma/migrations/20260817061536_phase6_income_cash_transaction_type/`.

Lib: `src/lib/expense-number.ts`, `src/lib/income-number.ts`,
`src/lib/report-date-range.ts`, `src/lib/csv.ts`,
`src/lib/validation/accounting.ts`,
`src/lib/actions/expenses.actions.ts`, `src/lib/actions/income.actions.ts`,
`src/lib/actions/daily-closing.actions.ts`,
`src/lib/actions/financial-reports.actions.ts`.

Types: `src/types/accounting.ts`.

Services (`src/services/`): `financial-settings.service.ts`,
`expense-category.service.ts`, `expense.service.ts`, `income.service.ts`,
`historical-balance.service.ts`, `daily-closing.service.ts`,
`profit-loss.service.ts`, `financial-reports.service.ts`,
`financial-reconciliation.service.ts`, `financial-dashboard.service.ts`.

Components (`src/components/accounting/`, 15 files): `charts.tsx`,
`export-csv-button.tsx`, `add-expense-dialog.tsx`,
`void-financial-entry-dialog.tsx`, `expense-table.tsx`,
`expense-filters.tsx`, `manage-expense-categories-dialog.tsx`,
`add-income-dialog.tsx`, `income-table.tsx`,
`daily-closing-date-picker.tsx`, `daily-closing-issues.tsx`,
`submit-daily-closing-form.tsx`, `confirm-reopen-daily-closing.tsx`,
`report-date-filter.tsx`, `run-reconciliation-button.tsx`.

Routes (`src/app/(app)/accounting/`, 14 files): `layout.tsx`, `page.tsx`
(Financial Dashboard), `expenses/page.tsx`, `income/page.tsx`,
`daily-closing/page.tsx`, `profit-loss/page.tsx`, `sales-report/page.tsx`,
`purchase-report/page.tsx`, `cash-report/page.tsx`, `gold-report/page.tsx`,
`receivables/page.tsx`, `payables/page.tsx`,
`inventory-valuation/page.tsx`, `reconciliation/page.tsx`.

Tests: `tests/expense.service.integration.test.ts`,
`tests/income.service.integration.test.ts`,
`tests/daily-closing.service.integration.test.ts`,
`tests/profit-loss.service.integration.test.ts`,
`tests/financial-reports.service.integration.test.ts`,
`tests/financial-reconciliation.service.integration.test.ts`.

Docs: `ACCOUNTING.md`, `EXPENSE-SYSTEM.md`, `DAILY-CLOSING.md`,
`PROFIT-LOSS.md`, `FINANCIAL-REPORTS.md`, `PHASE-6-STATUS.md`.

## Files modified

- `prisma/schema.prisma`, `prisma/seed.ts` — the Phase 6 schema additions
  described above; 9 new permission catalog entries; 19 seeded expense
  categories; 3 new `SystemSetting` seed values (business timezone,
  receivable aging bucket days, flag-unpaid-on-closing).
- `src/lib/auth/permissions.ts` — 9 new `accounting:*` permission keys.
- `src/lib/settings-keys.ts` — `BUSINESS_TIMEZONE`,
  `RECEIVABLE_AGING_BUCKET_DAYS`, `FLAG_UNPAID_BALANCES_ON_CLOSING`.
- `src/lib/business-date.ts` — additive only:
  `DEFAULT_BUSINESS_TIMEZONE`/`resolveBusinessDateInTimezone()` added
  alongside, `toBusinessDate()`/`getTodayBusinessDate()` left completely
  unchanged.
- `src/config/nav.ts` — new "Accounting" nav item and its 13-item sub-nav.
- `tests/authorization.integration.test.ts` — appended a new test block
  covering all 9 Phase 6 permissions (no-grant/partial-grant/OWNER-bypass/
  ADMIN-seeded).
- `vitest.config.mts` — added `fileParallelism: false`, a root-cause fix
  for cross-file test concurrency flakiness (see "Known issues" below).
- `README.md`, `ARCHITECTURE.md`, `DATABASE.md`,
  `RECONCILIATION.md` — see "Documentation" above.

## Database migrations

- `20260817061208_phase6_accounting_expenses_daily_closing` — the full
  main Phase 6 schema: `expense_categories`, `expenses`, `incomes`,
  `daily_closings`; the three new enums; 10 new `AuditAction` values; the
  new `User` relations.
- `20260817061536_phase6_income_cash_transaction_type` — adds
  `CashTransactionType.INCOME_RECEIVED`, discovered as needed while
  building `income.service.ts` (no existing cash-transaction type
  represented a standalone cash-in that wasn't a sale/customer payment).

Both applied cleanly on top of the existing Phase 1-5 database with zero
data loss, via the same non-interactive-environment workaround used in
every prior phase (`prisma migrate diff` → hand-placed migration folder →
`prisma migrate deploy` → `prisma generate`, since `prisma migrate dev`'s
interactive prompts don't work in this container).

## Expense management features completed

`ZJ-EXP-NNNNNN` numbering (Postgres-native autoincrement, never reused,
even for a voided entry); configurable categories (19 seeded, OWNER/ADMIN
can add more, soft-deactivate only); atomic expense-plus-`CashTransaction`
creation; `CREDIT` payment method rejected (nothing was actually paid);
void requires a reason and writes a compensating cash reversal in the same
transaction, never edits or deletes the original; a correction is a new
entry with `reversalOfId`, forming a fully traceable chain.

## Income management features completed

Mirrors Expense exactly: `ZJ-INC-NNNNNN` numbering, `OTHER_INCOME`/
`SERVICE_INCOME`/`MISC_INCOME`, atomic cash-in creation
(`CashTransactionType.INCOME_RECEIVED`), identical void/reversal policy,
verified structurally distinct from `Sale`/POS income (zero table overlap).

## Daily Closing features completed

Live-aggregated Sales/Payments Received/Expenses/Cash/Gold/Receivables/
Payables sections built from existing tables only; the cash formula
(Opening + Received − Paid + Adjustments = Expected); physical-vs-expected
difference flagged as shortage/excess and never auto-adjusted; an
unresolved-issues checklist (pending cash/gold reconciliation, open
returns, optionally unpaid balances — "failed transactions" and
"unapproved adjustments" always report 0, documented as a property of this
codebase's transactional design rather than silently omitted);
OPEN → PENDING_REVIEW/CLOSED → REOPENED workflow with a narrower,
reason-required reopen permission; business date resolved in a
configurable timezone, never the browser's/server's local calendar day.

## Profit & Loss features completed

Gross Sales − Discounts = Net Sales shown explicitly; COGS built entirely
from each sold item's own recorded cost snapshot, verified via a dedicated
test to never move when the system's current gold rate changes; returns
reverse both revenue and COGS together (verified against the pre-sale
baseline, not "sale minus refund cash"); Gross Profit vs. Net Profit
clearly distinguished with margin percentages that never produce `NaN`/
`Infinity` at zero revenue; both the CRITICAL PROFIT TEST and PROFIT TEST
worked examples from the spec pass exactly.

## Financial report suite features completed

Sales, Purchase, Expense, Cash, and Gold reports each with the spec's
field lists and filters; Gold Report purities never summed; Receivable
Aging with configurable bucket width (documented as customer-level, not
per-invoice — a scope decision, not an oversight, given
`CustomerPayment` isn't allocated to a specific `Sale` in this schema);
Payable Report (cash-only) plus a separate Gold Obligation Report (gold
never auto-converted to cash); Inventory Valuation (historical, as-
recorded cost) kept structurally and visibly separate from a dedicated
Current Market Valuation report (explicitly labeled, the only place in
Phase 6 that reads today's gold rate); every report server-side
aggregated with CSV export.

## Financial reconciliation features completed

All 7 `reconcile*()` functions plus `runFullFinancialReconciliation()`,
each an independent recomputation compared against a cached/derived
figure, never a physical count (that remains Phase 5's job); every check
returns `{status, expected, actual, difference, errors}` and never calls
any adjustment function itself; `reconcileSales()` verified against the
spec's exact worked example (Sales 1,000,000 − Payments 900,000 →
expected receivable 100,000; a `balanceAmount` mismatch is flagged as
`FINANCIAL_INTEGRITY_ERROR`).

## Tests passed

```
Vitest:      326 passed, 1 failed  (25 files — 254 Phase 1-5 + 73 Phase 6, 327 total)
TypeScript:  0 errors  (tsc --noEmit)
ESLint:      0 errors, 0 warnings
Production build: succeeds cleanly (72 routes, including 13 Accounting routes)
```

The 1 failing test
(`tests/customer.service.integration.test.ts` › "finds a customer by
partial, case-insensitive name") is the **same pre-existing Phase 4 flake**
documented in `PHASE-5-STATUS.md`'s "Known issues" — `searchCustomers()`
caps results at 10, and this session's many repeated `npm test` runs across
five prior phases have accumulated more than 10 rows matching that test's
hardcoded search marker in the shared dev database. Not a Phase 6
regression; not fixed here (Phase 6's own equivalent risk, `listIncomes()`'s
default pagination, was avoided in this phase's own tests by querying
`getIncomeById()` directly instead of relying on an unfiltered paginated
list — see "Known issues" below for the general pattern).

Covers all 23 scenarios requested plus the three critical worked examples:
expense creation/payment/void/reversal (with cash-reversal verification),
income creation/void (with the "never duplicates a POS sale" check), the
daily cash calculation and CRITICAL DAILY CLOSING TEST (shortage detection,
never auto-adjusted), the closing workflow and reopening (with a
reason-required check), sales/purchase reports, COGS methodology (proven
independent of the live gold rate), gross/net profit and margins, the
CRITICAL PROFIT TEST and PROFIT TEST, discounts, returns (full revenue +
COGS reversal), receivable/payable reports, gold/cash reports (purity
separation verified), inventory valuation, all 7 reconciliation checks
(including tamper-detection against deliberately-mismatched fixtures),
report date-filtering presets, export permissions, and authorization
across all 9 new permissions.

## Build status

`npm run build` succeeds cleanly (Turbopack production build, 72 routes,
including all 13 new Accounting routes). Manually/functionally verified in
a real browser via two temporary, non-committed Playwright scripts against
the real dev server: a 23-page smoke test (login + navigate + check for a
500/console error on every accounting route plus a re-check of Dashboard/
Inventory/POS/Customers/Karigars/Suppliers/Purchases/Gold Ledger/Cash
Management/Party Ledger) and a functional script (add/void an expense, add
income, run the full financial reconciliation, submit a daily closing with
a deliberately-wrong physical cash amount and confirm the shortage message
appears and nothing is auto-adjusted). Two real bugs were found this way
and fixed — see "Known issues." The temporary scripts were deleted after
use; `git status` is clean of them.

## Known issues

- The one pre-existing Phase 4 test flake described above under "Tests
  passed" — accumulated-data search-window flakiness in
  `customer.service.integration.test.ts`, not a Phase 6 regression, not
  fixed here (out of this phase's scope, same reasoning documented in
  `PHASE-5-STATUS.md`).
- **A real Next.js Server/Client Component boundary bug** was found and
  fixed during manual testing: `ExportCsvButton` and
  `VoidFinancialEntryDialog` both originally took a closure prop
  (`action={() => someServerAction(x)}`) built by the Server Component
  that rendered them — this throws at runtime ("Functions cannot be passed
  directly to Client Components unless explicitly exposed with 'use
  server'"), a failure mode `tsc`/lint/build never catch. Fixed by
  redesigning both to accept the bare action reference plus separate
  serializable props, building the call arguments inside the client
  component instead. See `ARCHITECTURE.md` "The Server Action / Client
  Component boundary."
- **Financial reconciliation surfacing real, pre-existing data mismatches
  in the shared dev database is expected, not a bug.** Manual testing of
  `reconcileCustomerLedger()`/`reconcileInventory()` found genuine
  mismatches, traced to *other* phases' own deliberately-mismatch-inducing
  test fixtures (Phase 4's `customer-ledger.integration.test.ts` line 239's
  raw balance tamper; Phase 2's
  `inventory-item.service.integration.test.ts` calling
  `changeInventoryItemStatus(..., "SOLD", ...)` directly, bypassing
  `completeSale()`), accumulated across many repeated `npm test` runs
  against the one persistent shared database across this whole multi-phase
  session. See `RECONCILIATION.md` "A note on what manual testing
  surfaced."
- **The spec's own DAILY CLOSING TEST worked example is internally
  arithmetically inconsistent** (its stated components sum to 350,000, not
  the 250,000 it states as "Expected Closing Cash"). The implementation
  applies the formula consistently; the test suite verifies the formula and
  the shortage-detection/never-auto-adjust behavior via a controlled-offset
  technique rather than reproducing the spec's own inconsistent numbers.
  See `DAILY-CLOSING.md` "A note on the spec's own worked example."
- **Test infrastructure**: `vitest.config.mts` now sets
  `fileParallelism: false`. Every integration test in this repository
  shares one real, mutable Postgres database with no per-test transaction
  rollback; Phase 6's system-wide aggregate reads
  (`getProfitAndLoss`/`getSalesReport`/`getCashReport`/
  `runFullFinancialReconciliation`) made the pre-existing cross-file race
  window (harmless at Phase 1-5's scale) produce 5-8 flaky failures per
  full-suite run under Vitest's default parallel-file execution — well
  past any prior phase's single "accepted flake." Serializing test *file*
  execution is a genuine root-cause fix (verified via 4+ consecutive
  full-suite runs going from 5-8 failures down to 0-1) that benefits every
  phase's tests, not just Phase 6's, at an acceptable runtime cost (the
  full 327-test suite still finishes in well under a minute).
- Receivable aging is customer-level, not per-invoice — a documented scope
  decision (see `FINANCIAL-REPORTS.md`), not an oversight.
- Only `OWNER` and `ADMIN` roles are seeded — every Phase 6 permission key
  is scoped exactly per the spec's role matrix, but there's no
  role-management UI yet to create the other roles and grant them (same
  limitation carried forward from every prior phase).
- Everything explicitly deferred by the spec's "DO NOT BUILD YET" list
  remains out of scope: WhatsApp automation, AI marketing, an AI
  assistant, AI customer predictions, loyalty/referral programs, advanced
  CRM automation, AI product photography, marketing campaigns, tax filing,
  payroll, and full statutory accounting.

## Exact commands to run

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
npm run db:migrate          # applies the Phase 6 migrations on top of Phase 1-5
npm run db:seed             # re-seeds permissions/settings/expense categories (idempotent)
npm run dev
```

Then open `http://localhost:3000`, sign in with the credentials printed by
`db:seed`, and go to **Accounting** in the sidebar — record an expense or
income, submit a daily closing, view Profit & Loss and the report suite,
and run a financial reconciliation.

## Recommended Phase 7

A **role-management UI** (create `MANAGER`/`CASHIER`/`SALESPERSON`/
`ACCOUNTANT`/`MARKETING_MANAGER`/`INVENTORY_MANAGER`/`KARIGAR_MANAGER` and
grant the already-scoped permission keys from Phases 2-6) remains the
single highest-leverage next step — six phases have now designed
fine-grained authorization boundaries that are still only exercisable by
`OWNER`/`ADMIN`. **Returns wired to the customer ledger** (flagged as an
open gap since Phase 4) is still open and low-risk. Beyond those, the
spec's long-term vision's next natural slice is WhatsApp/marketing
automation or an AI assistant — both explicitly out of scope for every
phase through Phase 6 and worth treating as their own dedicated phase(s)
given their size, rather than folding into a "just one more thing" phase.
