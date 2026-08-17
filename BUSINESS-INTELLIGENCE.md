# Business Intelligence (Phase 8)

The product overview for the **Business Intelligence** module — the nav
item, its 16-item sub-nav, and the design principles every BI screen and
service follows. See `EXECUTIVE-DASHBOARD.md`, `ANALYTICS.md`,
`FORECASTING.md`, `ALERT-SYSTEM.md`, `AUTOMATED-REPORTS.md`, and
`BRANCH-ARCHITECTURE.md` for the individual sub-systems this file ties
together.

## What this phase is, and isn't

Business Intelligence introduces **no new source of truth** for money,
gold, or customer data. Every KPI, chart, and report is a live
composition of a Phase 1-7 service function that was already built and
already tested — `getProfitAndLoss()`, `getSalesReport()`,
`listGoldWithKarigars()`, `getCampaignAttribution()`, and so on. What
Phase 8 adds is:

1. **Analytics rollups** — 12 `bi-*.service.ts` files that compose those
   existing functions into the specific views the spec asks for (growth
   percentages, age buckets, cohorts, top-N rankings), plus a handful of
   genuinely new server-side aggregate queries (sales trend by day/week/
   month, profit by category, top products).
2. **Alerts** — a rule-based notice system reading real data on demand,
   never modifying the transaction it flags. See `ALERT-SYSTEM.md`.
3. **Forecasts** — bounded, clearly-labeled estimates computed from real
   historical series, never persisted as a "fact." See `FORECASTING.md`.
4. **AI insights** — plain-English sentences built entirely from numbers
   TypeScript already computed; no call to an AI provider is ever made in
   this computation path. See "AI insights" below.
5. **Reports** — daily/weekly/monthly owner summaries with real CSV
   export. See `AUTOMATED-REPORTS.md`.
6. **A multi-branch foundation** — the `Branch`/`UserBranch` models and
   branch-scoped authorization primitives, deliberately not wired into
   every existing creation flow yet. See `BRANCH-ARCHITECTURE.md`.

## Nav structure

**Business Intelligence** (`(app)/business-intelligence/`), 16 sub-nav
items in the spec's exact order: Executive Dashboard, Sales Analytics,
Profit Analytics, Inventory Analytics, Gold Analytics, Customer Analytics,
Karigar Analytics, Supplier Analytics, Cash Analytics, Marketing
Analytics, Forecasting, Alerts, Daily Report, Weekly Report, Monthly
Report, Branch Management. `src/config/nav.ts`'s
`BUSINESS_INTELLIGENCE_SUB_NAV` is the single source of truth for this
list; it replaced the old placeholder `/reports` route entirely (the
placeholder page is deleted).

`(app)/business-intelligence/layout.tsx` requires `bi:dashboard_view`
once, the same "check the coarse view permission in a nested layout"
pattern every prior phase's module uses. Each individual analytics page
additionally checks its own finer-grained `bi:*_view` permission — see
`ARCHITECTURE.md` "Authorization design."

## Server-side aggregation, always

Every chart and table is computed with a single grouped SQL query (via
Prisma's `groupBy` or a raw `$queryRaw` with `date_trunc`) and returns
already-aggregated rows — never a list of raw `Sale`/`SaleItem`/
`CashTransaction` rows for the browser to sum. This matters at real
transaction volumes: a "This Month" sales trend for a busy shop could be
thousands of line items, and none of them ever crosses the network to the
client. See `bi-sales-analytics.service.ts`'s `getSalesTrend()` and
`bi-profit-analytics.service.ts`'s `getProfitTrend()`/
`getProfitByCategory()`/`getTopProducts()` for the concrete pattern.

## AI insights

`bi-insight.service.ts`'s `getBusinessInsights()` returns a small list of
`{metric, period, source, explanation}` records — e.g. "Net sales
increased 14% compared with the previous comparable period ($X vs. $Y)."
Every number in every explanation comes from a real backend service call
(`getSalesPerformance()`, `getInventoryAgeBuckets()`,
`getMarketingAnalyticsSummary()`, `getHistoricalTotalReceivable()`); the
file does not import or call any `AiProvider` function. This is the
strongest possible enforcement of the spec's "AI must not compute
financial figures" requirement — there is no AI call in the
number-computation path to misuse in the first place. See
`ARCHITECTURE.md` "The facts-only, no-AI-invoked insight design" and the
CRITICAL AI INSIGHT TEST in `tests/bi-insight.service.test.ts`.

`getBusinessInsightsAudited(userId)` wraps the same function with an
`AI_INSIGHT_GENERATED` audit log write — see "Audit log" below.

## Caching and AI cost control

BI dashboards do **not** call an AI provider on every page load — Phase 8
ships zero AI-provider calls anywhere in the module (see "AI insights"
above). Every metric is a deterministic backend calculation, computed
on-demand from live data rather than cached-and-invalidated, since Phase
1-7's own service functions are already fast, indexed aggregate queries —
adding a caching layer on top of them was judged unnecessary complexity
for this phase's data volumes. There is therefore no stale-data risk to
document: every screen always reflects the database at the moment of the
request. If a future phase introduces real per-vendor AI calls or heavier
aggregate caching, that cache's invalidation policy must be documented
here at that time.

## Audit log

Ten new `AuditAction` values, written by the relevant BI service/action:
`DASHBOARD_EXPORTED`, `FORECAST_GENERATED`, `FORECAST_VIEWED`,
`ALERT_ACKNOWLEDGED`, `ALERT_RESOLVED`, `ALERT_DISMISSED`,
`BRANCH_CREATED`, `BRANCH_SETTINGS_CHANGED`, `REPORT_GENERATED`,
`AI_INSIGHT_GENERATED`. See `DATABASE.md` "Branch-scoping additions to
existing tables."

## Permissions

17 `bi:*` permission keys — see `ARCHITECTURE.md` "Authorization design"
for the full list and the spec's per-role matrix (OWNER full access;
ADMIN configured access; MANAGER branch-level analytics; ACCOUNTANT
financial analytics; INVENTORY_MANAGER inventory/gold analytics;
MARKETING_MANAGER marketing/customer analytics; CASHIER a limited
operational dashboard). Only `OWNER`/`ADMIN` are seeded with grants today
— same limitation as every prior phase's permission set.

## What Phase 8 explicitly does not build

Per the spec's own "DO NOT BUILD YET" list: full general-ledger
accounting, tax filing, payroll, automatic price changes, automatic
product discounts, guaranteed AI forecasts, unapproved customer
profiling, unofficial WhatsApp automation, automatic social-media
posting, AI financial/trading advice, automatic stock purchasing, and
complex stock-transfer workflows. None of these exist anywhere in the
Phase 8 codebase.
