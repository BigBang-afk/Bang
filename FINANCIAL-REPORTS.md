# Financial Reports (Phase 6)

Every report in this file lives in `financial-reports.service.ts` (Sales/
Purchase/Expense/Cash/Gold/Receivable Aging/Payable/Gold Obligation/
Inventory Valuation/Current Market Valuation) or `profit-loss.service.ts`
(see `PROFIT-LOSS.md`). All of them aggregate server-side — a report page
never fetches every underlying row and computes totals in the browser —
and every date-scoped report shares the common preset vocabulary described
in `ACCOUNTING.md` "Report date presets".

## Sales Report

`getSalesReport(preset, custom, filters)` — filters: `cashierId`,
`customerId`, `categoryId`, `paymentMethod`. Fields: Gross Sales,
Discounts, Net Sales, Invoice Count (distinct sales), Items Sold, Average
Invoice Value, a Cash/Card/Bank/Credit payment-method split, Refunds
(returns processed in range), and gold sold by purity (never combined
across purities). Excludes fully-returned `SaleItem`s, same rule as the
P&L.

## Purchase Report

`getPurchaseReport(preset, custom, filters)` — filters: `supplierId`,
`categoryId`, `purity`, `paymentStatus` (derived via the existing
`derivePurchasePaymentStatus()` from Phase 5, applied client-side after the
date/supplier/item filters since payment status isn't a stored column).
Fields: Purchase Count, Total Purchase Cost, Amount Paid, Outstanding
Payable, Items Purchased, gold purchased by purity.

## Expense Report

`getExpenseReport(preset, custom)` — `status: ACTIVE` only (a voided
expense is never counted, and its compensating cash reversal is what keeps
the Cash Report correct instead). Fields: Total Expenses, a breakdown by
category (sorted highest-first) with each category's live name (never a
stale copy), and a breakdown by payment method. Reachable from Accounting →
Expenses directly — there is no separate `/accounting/expense-report`
route (see "Report navigation" below).

## Cash Report

`getCashReport(preset, custom)` — Opening Cash (`getCashBalanceAsOf(from)`),
Cash In, Cash Out, Expected Closing (`opening + in - out`), the most recent
`CashReconciliation`'s physical count and difference if one was run inside
the range (otherwise both `null` — the report never fabricates a physical
count), and a full breakdown by `(transactionType, direction)`.

## Gold Report

`getGoldReport(preset, custom)` — one row **per purity**, purities never
summed together: Opening Gold, Gold Purchased, Gold Received, Gold Given,
Gold Sold, Gold Returned, Gold Adjustments, Closing Gold. Opening is
reconstructed historically (`getHistoricalSystemGoldWeight`); Closing uses
the live figure (`getSystemGoldWeightForPurity`) when the range extends
into the present, or the same historical reconstruction otherwise, so a
past custom range reports what closing gold actually was *then*, not a
value that's since moved. A future pure-gold-equivalent conversion across
purities, if ever built, must be a separate, explicitly-labeled metric —
this report will never silently combine 22K and 21K grams into one number.

## Receivable Aging Report

`getReceivableAgingReport()` — every customer with `outstandingBalance > 0`,
bucketed by `ageDays` (days since their most recent `Sale`) into
Current / 1-N / N+1-M / M+ using the configurable
`accounting.receivable_aging_bucket_days` width (default 30, so buckets
land at Current/1-30/31-60/61-90+ by default — the spec's aging shape,
driven by one configurable number rather than four hardcoded ones).
**Deliberately customer-level, not per-invoice**: `CustomerPayment` isn't
allocated to a specific `Sale` in this schema (see `CUSTOMER-LEDGER.md`),
so there's no reliable per-invoice aging basis to build on without adding
that allocation — a documented scope decision, not an oversight. `ageDays`
is therefore a proxy (days since last sale), not "days this specific
invoice has been outstanding."

## Payable Report

`getPayableReport()` — every karigar/supplier with a cash payable
(`listAllCashPayables()`, Phase 5), aged by their most recent
`PartyCashLedgerEntry`. Cash-only — gold obligations are reported
separately (below) and never folded into this rupee figure, since gold and
cash payables are never combined into one number anywhere in this
codebase.

## Gold Obligation Report

`getGoldObligationReport()` — gold held with each karigar/supplier, by
purity (`listGoldWithKarigars()`/`listGoldWithSuppliers()`, Phase 5). Gold
is never auto-converted to a cash payable/receivable figure here or
anywhere else.

## Inventory Valuation vs. Current Market Valuation — two distinct reports

- **`getInventoryValuationReport()`** — the historical, as-recorded figure:
  every active (`archivedAt: null`, not yet `SOLD`) item's own stored
  `totalCost`/`sellingPrice`, summed and broken down by category, purity,
  supplier, and age bucket (0-30/31-90/91-180/180+ days). Reports Cost
  Value, Selling Value, and Expected Gross Profit
  (`sellingValue - costValue`). This is the number every other report and
  the P&L treats as the item's cost — it never changes just because gold
  rates moved.
- **`getInventoryCurrentMarketValuation()`** — explicitly, separately
  labeled "Current Market Value." Recomputes **only** the raw gold-value
  portion of current stock using **today's** effective rate per purity
  (`getEffectiveRatesForDate(getTodayBusinessDate())`) — making/stone/
  diamond/other charges are never rate-dependent, so they're carried over
  unchanged from the original record. This is the one place in the whole
  Phase 6 report suite that intentionally uses today's gold rate, and it
  never overwrites or is confused with `getInventoryValuationReport()`'s
  historical `costValue` — the two are always presented as separate,
  clearly labeled figures, per the spec's explicit requirement that
  historical inventory must never be silently revalued elsewhere.

## Financial Dashboard

`financial-dashboard.service.ts` — `getFinancialDashboardSummary()` (top
cards: Today's Sales/Gross Profit/Expenses/Net Profit, Cash Balance,
Customer Receivables, Supplier Payables, Gold With Karigars),
`getDailyTrend()` (Sales Trend / Profit Trend charts), and
`getSalesByCategoryThisMonth()` (Sales by Category chart). Every figure is
a real, live aggregate from the tables above — never demo/placeholder
data. Payment Method Breakdown reuses the Cash Report's `byType` shape.
Charts are rendered with a small dependency-free SVG component
(`src/components/accounting/charts.tsx`) rather than pulling in a charting
library for two simple chart shapes.

## Report export (CSV)

Every listed report has a CSV export via `toCsv(headers, rows)`
(`src/lib/csv.ts`) — a small RFC 4180-compliant builder (quotes/commas/
newlines inside a cell are escaped, not just naively joined with `,`).
Export is triggered by `<ExportCsvButton>`
(`src/components/accounting/export-csv-button.tsx`), which takes the
**bare** export Server Action reference plus a separate `actionInput` prop
built by the page — see `ARCHITECTURE.md` "The Server Action / Client
Component boundary" for why it's built that way. Every export logs a
`REPORT_EXPORTED` audit entry (report type + resolved date range, never the
exported rows themselves). The architecture is intentionally left open for
a future Excel/PDF export (a second export function per report, sharing
the same data-fetching call) — but only CSV is built now; there are no
placeholder or broken export buttons anywhere in the suite.

## Report navigation

The Accounting nav's 13 items exactly match the spec's literal list.
Notably, there is **no separate "Expense Report" nav entry** — the spec's
own "EXPENSE REPORT" prose section implies one, but its authoritative
13-item NAVIGATION list only has "Expenses." `getExpenseReport()`'s
breakdown and export live directly on the Accounting → Expenses page
rather than a standalone route, resolving that internal spec conflict in
favor of the literal nav list.

## Permissions

`accounting:reports:view` gates every report page.
`accounting:export` additionally gates every CSV export action. `OWNER`
bypasses both.
