# Accounting (Phase 6)

## Disclaimer

This is a **practical bookkeeping layer**, not a legally-compliant
statutory tax/accounting system for Pakistan or anywhere else. It does not
implement double-entry general-ledger accounting (no chart of accounts, no
debit/credit journal), does not file tax returns, and does not run payroll.
Any business relying on this for tax compliance must have it reviewed by a
qualified accountant first. Tax handling (`tax.enabled`/`tax.percent`,
Phase 3) stays configurable and off by default — nothing in Phase 6 turns
it on or assumes it's on.

## Sources of truth — reports aggregate, they never duplicate

Phase 6 introduces exactly two genuinely new tables that hold money:
`Expense` and `Income`. Every other figure a Phase 6 report shows is read
live from a table an earlier phase already owns:

| Figure                | Source of truth                              |
| ---------------------- | --------------------------------------------- |
| Sales revenue           | `Sale` / `SaleItem` / `Payment` (Phase 3)     |
| Cost of goods sold       | `SaleItem`'s copied cost snapshot (Phase 3)   |
| Customer receivables    | `CustomerLedgerEntry` / `Customer.outstandingBalance` (Phase 4) |
| Supplier/karigar payables | `PartyCashLedgerEntry` / `PartyCashBalance` (Phase 5) |
| Gold positions          | `GoldLedgerEntry` / `PartyGoldBalance` (Phase 5) |
| Physical cash            | `CashTransaction` (Phase 5)                   |
| Purchases                | `Purchase` / `PurchaseItem` / `PurchasePayment` (Phase 5) |
| Expenses                 | `Expense` **(new, Phase 6)**                  |
| Other/service/misc income | `Income` **(new, Phase 6)**                 |

No Phase 6 service ever writes to `Sale`, `CustomerLedgerEntry`,
`PartyCashLedgerEntry`, `GoldLedgerEntry`, or `CashTransaction` for
reporting purposes — it only reads and aggregates them. The one place Phase
6 *does* write to `CashTransaction` is the physical-cash side-effect of an
`Expense`/`Income` entry itself (see `EXPENSE-SYSTEM.md`), exactly the same
shape Phase 5 already established for sale/purchase payments.

## Business date & timezone

Phase 1's gold-rate business date (`toBusinessDate()`/
`getTodayBusinessDate()` in `src/lib/business-date.ts`) is left completely
unchanged — it still uses the server's local calendar day. Phase 6 adds a
**separate** function, `resolveBusinessDateInTimezone(instant, timeZone)`,
used specifically for accounting/reporting "what day is it" questions:
Daily Closing's business date, and every report's date-preset resolution
(`resolveReportDateRange()` in `src/lib/report-date-range.ts`). The
timezone is a `SystemSetting` (`business.timezone`, default
`"Asia/Karachi"`), read fresh on every call via
`getBusinessTimezone()`/`getCurrentBusinessDate()`
(`financial-settings.service.ts`) — never assumed to be the browser's or
server's local timezone, and never cached.

## Report date presets

Every report and the Financial Dashboard share one preset vocabulary
(`REPORT_DATE_PRESETS` in `src/lib/report-date-range.ts`): `today`,
`yesterday`, `this_week`, `last_7_days`, `this_month`, `last_month`,
`this_year`, `custom`. Resolution (`resolveReportDateRange()`) is always
server-side — a report page reads `preset`/`from`/`to` out of
`searchParams` (`parseReportDateParams()`), and the client never computes
or sends a resolved date range itself.

## Permissions

Nine `accounting:*` permission keys (`src/lib/auth/permissions.ts`),
matching the spec's role matrix:

| Key                              | Purpose                                    |
| ---------------------------------- | -------------------------------------------- |
| `accounting:reports:view`          | View any financial report or the dashboard  |
| `accounting:expenses:view`         | View expenses                               |
| `accounting:expenses:create`       | Create an expense                           |
| `accounting:expenses:manage`       | Manage categories, void an expense          |
| `accounting:income:manage`         | Create/void income                          |
| `accounting:daily_closing`         | Submit a daily closing                      |
| `accounting:daily_closing:reopen`  | Reopen a closed day — a strictly narrower audience than who can submit one |
| `accounting:reconcile`             | Run financial reconciliation                |
| `accounting:export`                | Export a report to CSV                      |

`OWNER` bypasses every check, same as every prior phase. Only `OWNER`/
`ADMIN` are seeded with grants today (`prisma/seed.ts`) — the keys already
encode ACCOUNTANT (full reports/expenses/income/reconciliation),
MANAGER (view/daily-closing/limited adjustments), CASHIER (daily
closing/cash/limited expense access), and SALESPERSON (none, unless
explicitly granted) for whenever a role-management UI ships — see
`README.md` "Known limitations".

## Navigation

The "Accounting" nav item renders exactly the 13 sub-nav items the spec
names, in order: Financial Dashboard, Expenses, Income, Daily Closing,
Profit & Loss, Cash Report, Gold Report, Receivables, Payables, Sales
Report, Purchase Report, Inventory Valuation, Financial Reconciliation. See
`ARCHITECTURE.md` "`(app)/accounting/`".

## What this phase does not build

Per the spec's explicit "do not build yet" list: WhatsApp automation, AI
marketing, AI assistant, AI customer predictions, loyalty/referral
programs, advanced CRM automation, AI product photography, marketing
campaigns, tax filing, payroll, and full statutory accounting all remain
out of scope.
