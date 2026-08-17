# Analytics (Phase 8)

The 10 analytics sub-pages under Business Intelligence — Sales, Profit,
Inventory, Gold, Customer, Karigar, Supplier, Cash, and Marketing
Analytics — and the service files behind them. See
`EXECUTIVE-DASHBOARD.md` for the top-level KPI dashboard these pages
support, and `BUSINESS-INTELLIGENCE.md` for the module's shared design
principles (server-side aggregation, no new source of truth).

## Sales analytics

`bi-sales-analytics.service.ts`.

- **`getSalesPeriodComparison()`** — Today/Yesterday/This Month/Last Month
  totals (from `getSalesReport()`) plus day-over-day and
  month-over-month `computeGrowth()` results. A zero previous period
  always renders NO COMPARISON, never a fabricated percentage.
- **`getSalesTrend(preset, grouping, custom?, filters?)`** — one
  `date_trunc`-grouped SQL query per chart, bucketed by day/week/month.
  `filters` accepts Category, Purity, Cashier, Customer, Payment Method,
  and Branch — all applied as SQL `WHERE` conditions, never a client-side
  filter over an already-fetched row set.

## Profit analytics

`bi-profit-analytics.service.ts`.

- **`getProfitTrend(preset, grouping, custom?)`** — Revenue, COGS, Gross
  Profit, Expenses, and Net Profit per period, from a single grouped
  query joining `sale_items`/`sales`/`expenses` (excluding cancelled/
  voided sales and returned items server-side).
- **`getProfitByCategory(preset, custom?)`** — grouped by the real,
  configurable `ProductCategory` table (a join through
  `sale_items → inventory_items → products → product_categories`) —
  **never** a hardcoded category list, so a category an owner adds later
  shows up automatically.
- **`getTopProducts(preset, metric, custom?, limit)`** — Best Selling
  (units), Highest Revenue, or Highest Profit, grouped by each sold
  item's recorded `SaleItem.productName` (so a since-archived product
  still reports correctly for a past period). Completed sales only;
  cancelled/voided sales and returned items are excluded via the same
  `LEFT JOIN returns ... WHERE r.id IS NULL OR r.status != 'RETURNED'`
  pattern every profit query in this file uses.

COGS is always each sold item's own recorded cost snapshot
(`goldValue + makingCharge + stoneCharge + diamondCharge + otherCharge`)
— the exact fields `profit-loss.service.ts` already sums — never
recalculated from today's gold rate.

## Inventory analytics

`bi-inventory-analytics.service.ts`.

- **`getInventoryStatusBreakdown()`** — Total/In Stock/Reserved/Sold/
  Returned/Damaged/Lost/Inactive counts, plus Cost Value, Selling Value,
  and Expected Gross Profit from `getInventoryValuationReport()`.
- **`getInventoryAgeBuckets()`** — the spec's exact 5 buckets (0-30,
  31-60, 61-90, 91-180, 180+ days), each with item count, cost value, and
  selling value. This is a finer-grained split than
  `financial-reports.service.ts`'s own 4-bucket inventory-valuation age
  split, so it's kept as its own query rather than reusing that one.
  Flags aging stock; **never** auto-discounts it — the UI only ever shows
  the breakdown, no "apply discount" action exists anywhere near it.
- **`getSlowMovingInventory(limit)`** — items with no recorded sale in a
  configurable window (`BI_AGING_STOCK_DAYS`, default 90), each with a
  plain-text recommendation ("Consider a campaign for this product, or
  moving it to a featured display.") — always a recommendation a human
  reads and acts on, **never** an automatic price, discount, or display
  change.

## Gold analytics

`bi-gold-analytics.service.ts`. Every figure here is purity-separated —
21K/22K/18K/24K/Silver are never summed together into one meaningless
"grams of gold" total, per `GOLD-LEDGER.md`'s own established discipline.

- **`getGoldByPurity(preset, custom?)`** — a direct pass-through of Phase
  6's `getGoldReport()`: Purchased/Sold/Received/Given/Returned per
  purity.
- **`getGoldRateAnalytics(historyDays)`** — Current vs. most-recent-prior
  rate (`rate.service.ts`'s `getEffectiveRatesForDate()`), Change and
  Change % per purity, plus a 7/30/90-day history read directly from the
  `GoldRate` table — **never** a number the AI provider invents.
- **`getGoldExposure()`** — Physical (from `InventoryItem.netWeight`,
  `IN_STOCK`/`RESERVED` only), With Karigars, and With Suppliers, one row
  per purity. **Pure Gold Equivalent is deliberately not computed** — see
  `BRANCH-ARCHITECTURE.md`-adjacent reasoning: the spec never specifies
  purity-conversion rules (e.g. exactly how many grams of 21K equal one
  gram of 24K, and whether wastage/making-charge factors apply), and
  inventing that formula would produce a number nobody explicitly asked
  for and nobody can verify. The architecture is prepared for it (every
  purity total is already computed separately, ready to combine once the
  conversion rule is explicit), it's just not implemented yet.

## Customer analytics

`bi-customer-analytics.service.ts` — rolls up Phase 4's own
`getCustomerDashboardSummary()` rather than re-deriving Total/New/
Active/VIP/Inactive counts, and adds three new views:

- **`getCustomerAnalyticsSummary()`** — adds `repeatCustomers` and
  **`repeatPurchaseRatePercent`**: (customers with 2+ completed
  purchases) / (customers with at least 1 completed purchase) × 100,
  `null` when no customer has ever purchased (division would be
  meaningless). This exact definition is the one and only "repeat
  purchase rate" formula in the codebase.
- **`getTopCustomers(metric, limit)`** — Highest Spending or Most
  Frequent Buyers, from completed sales only (`status != "RETURNED"`),
  so a return already reduces a customer's counted spending correctly
  (returns are excluded at the point `Sale.grandTotal`/status reflect
  them, not double-subtracted here).
- **`getAverageCustomerLifetimeValue()`** — average total spending across
  every customer with at least one completed purchase.
- **`getCustomerCohorts(monthsForward, maxCohorts)`** — groups customers
  by first-purchase month and reports Month 0/1/2/.../N retention as a
  percentage of that cohort's size. Month 0 is always 100% by
  construction (it's the cohort-defining purchase). This reports a plain
  fact — did this cohort's customers buy again in a later month — and
  **never** claims a cause; no text anywhere attributes a cohort's
  retention to a specific campaign, promotion, or event.

## Karigar analytics

`bi-karigar-analytics.service.ts`.

- **`getKarigarAnalyticsSummary()`** — Active Karigars, Jobs Completed/
  Pending, Gold Given/Received/Difference (from `KarigarGoldJob`
  aggregates), and Cash Payable/Receivable totals (from
  `listKarigarCashPositions()`).
- **`getKarigarPerformance()`** — **operational metrics only**: jobs
  completed, average completion time (hours from gold-given to
  gold-received), and reconciliation outcome counts
  (WITHIN_ALLOWANCE/EXCESS_DIFFERENCE/SHORTAGE). There is no quality
  score, ranking, or "best/worst karigar" field anywhere in this
  function's return type — the spec is explicit that a karigar must never
  be ranked on unsupported quality assumptions, and this is enforced by
  the return type itself simply not having a field to hold one. See
  `tests/bi-analytics-smoke.integration.test.ts` (Test 9) for the
  assertion that no such field exists.

## Supplier analytics

`bi-supplier-analytics.service.ts` — composes Phase 5's
`getPurchaseSummary()` for the headline totals (Total Purchases/
Purchase Value/Amount Paid/Outstanding/Gold Purchased/Gold Returned) and
adds `getTopSuppliers(metric, limit)` for a per-supplier volume or value
ranking.

## Cash analytics

`bi-cash-analytics.service.ts`.

- **`getCashAnalytics(preset, custom?)`** — the period totals from Phase
  6's `getCashReport()` plus the spec's 6-bucket breakdown (Sales,
  Customer Payments, Supplier Payments, Karigar Payments, Expenses,
  Other), derived by re-bucketing that report's own by-transaction-type
  rows — never a second independent money computation.
- **`getBranchCashTotals(user, preset, branchId?, custom?)`** — the
  concrete branch-scoped query the CRITICAL branch-isolation test
  exercises. See `BRANCH-ARCHITECTURE.md` "Branch access."

## Marketing analytics

`bi-marketing-analytics.service.ts` — a pure rollup of Phase 7's own
`campaign-analytics.service.ts` (up to the 50 most recent campaigns, a
bounded server-side fan-out rather than an unbounded one): Campaigns,
Messages Sent/Delivered/Read, Replies, Delivery/Read/Reply Rate percent,
and — critically — **`directRevenue`/`directOrders` and
`assistedRevenue`/`assistedOrders` as two permanently separate fields**.
There is no `totalMarketingRevenue` field anywhere in this type; summing
the two would overstate what marketing actually caused, which is exactly
what Phase 7's `CAMPAIGN-SYSTEM.md` "Attribution" section already
established the codebase must never do. See
`tests/bi-analytics-smoke.integration.test.ts` (Test 12).
