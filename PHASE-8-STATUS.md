# Phase 8 Status — Advanced Business Intelligence + Owner Dashboard + Forecasting + Alerts + Multi-Branch Foundation

Status: **Complete**. Typecheck, lint, and a production build all pass with
zero errors and zero warnings as of this writing. The full Vitest suite
passes 478/478 (45 files — 417 Phase 1-7 + 61 new Phase 8 tests). Phases
1-7 were re-verified (all their tests still pass unchanged) before this
status was written. Manual/functional verification was performed in a
real browser against the dev server — see "Build status."

## Scope delivered

- **Database** — one migration adding `Branch`, `UserBranch`, and `Alert`;
  5 new enums (`BranchAccessMode`, `BranchStatus`, `AlertType`,
  `AlertSeverity`, `AlertStatus`); additive nullable `branchId` columns on
  8 existing transactional tables (`InventoryItem`, `Sale`, `Karigar`,
  `Supplier`, `CashTransaction`, `Purchase`, `KarigarGoldJob`, `Expense`);
  `User.branchAccessMode`/`primaryBranchId`; 10 new `AuditAction` values.
  No changes to any Phase 1-7 table's existing columns or behavior — Phase
  8 is purely additive. See `DATABASE.md`.
- **Branch-authorization foundation** — `resolveAuthorizedBranchIds()` /
  `branchWhereClause()`, the two primitives every branch-sensitive BI
  query composes; never trusts a frontend-supplied `branchId`. See
  `BRANCH-ARCHITECTURE.md`.
- **Executive Dashboard** — 12 real-data KPI cards, a 7-preset date
  selector, and the shared `computeGrowth()` formula (safe against a zero
  previous period). See `EXECUTIVE-DASHBOARD.md`.
- **10 analytics rollups** — Sales, Profit, Inventory, Gold, Customer,
  Karigar, Supplier, Cash, and Marketing Analytics, each composing an
  already-tested Phase 1-7 service function rather than re-deriving it.
  See `ANALYTICS.md`.
- **Alert engine** — 10 threshold-driven generators covering 11 of the 12
  spec'd alert types (see "Known issues" for the one gap), dedup-by-entity
  so re-scanning is always safe, and a full OPEN → ACKNOWLEDGED/RESOLVED/
  DISMISSED lifecycle. See `ALERT-SYSTEM.md`.
- **AI Business Insights** — every insight built by string-interpolating
  numbers an already-tested backend function computed; the file never
  calls an `AiProvider`. See `BUSINESS-INTELLIGENCE.md` "AI insights."
- **Forecasting engine** — Sales/Expense/Cash/Inventory demand/Customer
  purchase forecasts, all sharing one bounded, clamped-growth-rate
  projection model and a configurable data-sufficiency gate that returns
  `null` (never a fabricated number) below the minimum history threshold.
  See `FORECASTING.md`.
- **Daily/Weekly/Monthly owner reports** — real DB aggregates, real CSV
  export, PDF export deliberately left as prepared architecture, not a
  fake button. See `AUTOMATED-REPORTS.md`.
- **Notification abstraction** — `NotificationProvider` interface + mock
  implementation, mirroring Phase 7's `AiProvider`/`MarketingProvider`
  pattern exactly; per-user notification preferences as a JSON
  `SystemSetting` row. See `AUTOMATED-REPORTS.md` "Owner notification
  architecture."
- **Multi-branch foundation** — `Branch`/`UserBranch` models, branch CRUD,
  branch-scoped analytics, and an explicit GLOBAL-vs-BRANCH data
  categorization — deliberately not wired into every existing creation
  flow yet. See `BRANCH-ARCHITECTURE.md`.
- **Permissions** — 17 new `bi:*` keys matching the spec's per-role
  matrix.
- **Settings** — 9 configurable BI numbers (low-stock threshold, aging
  days, cash-shortage/sales-drop/expense-spike thresholds, high-balance
  threshold, unusual-transaction amount, two forecast confidence
  day-counts), all `SystemSetting`-backed, read fresh on every call.
- **Tests** — 61 new Vitest tests across 6 new integration/unit test
  files plus a Test-25 block appended to `authorization.integration.test.ts`,
  for **478** total tests across all eight phases (see "Tests passed").
- **Documentation** — this file, `BUSINESS-INTELLIGENCE.md`,
  `EXECUTIVE-DASHBOARD.md`, `ANALYTICS.md`, `FORECASTING.md`,
  `ALERT-SYSTEM.md`, `BRANCH-ARCHITECTURE.md`, `AUTOMATED-REPORTS.md`,
  plus updates to `README.md`, `ARCHITECTURE.md`, and `DATABASE.md`.

## Files created

Schema: `prisma/migrations/20260817170326_phase8_business_intelligence_branches_alerts/`.

Lib: `src/lib/branch-code.ts`, `src/lib/validation/business-intelligence.ts`,
`src/lib/actions/alerts.actions.ts`, `src/lib/actions/bi-reports.actions.ts`,
`src/lib/actions/bi-settings.actions.ts`, `src/lib/actions/branches.actions.ts`,
`src/lib/actions/notification-preferences.actions.ts`.

Services (`src/services/`): `alert.service.ts`, `bi-cash-analytics.service.ts`,
`bi-customer-analytics.service.ts`, `bi-dashboard.service.ts`,
`bi-gold-analytics.service.ts`, `bi-insight.service.ts`,
`bi-inventory-analytics.service.ts`, `bi-karigar-analytics.service.ts`,
`bi-marketing-analytics.service.ts`, `bi-profit-analytics.service.ts`,
`bi-report.service.ts`, `bi-sales-analytics.service.ts`,
`bi-settings.service.ts`, `bi-supplier-analytics.service.ts`,
`branch-access.service.ts`, `branch.service.ts`, `forecast.service.ts`,
`notification-preferences.service.ts`,
`notification/notification-provider.ts`,
`notification/mock-notification-provider.ts`.

Components (`src/components/business-intelligence/`): `growth-indicator.tsx`,
`alerts-list.tsx`, `run-alert-scan-button.tsx`, `add-branch-dialog.tsx`,
`user-branch-access-form.tsx`.

Routes (`src/app/(app)/business-intelligence/`, 16 routes): `layout.tsx`,
`page.tsx` (Executive Dashboard), `sales/`, `profit/`, `inventory/`,
`gold/`, `customers/`, `karigars/`, `suppliers/`, `cash/`, `marketing/`,
`forecasting/`, `alerts/`, `reports/daily/`, `reports/weekly/`,
`reports/monthly/`, `branches/`.

Tests: `tests/alert.service.integration.test.ts`,
`tests/branch-access.service.integration.test.ts`,
`tests/forecast.service.integration.test.ts`,
`tests/bi-insight.service.test.ts`,
`tests/bi-report.service.integration.test.ts`,
`tests/bi-analytics-smoke.integration.test.ts`.

Docs: `BUSINESS-INTELLIGENCE.md`, `EXECUTIVE-DASHBOARD.md`, `ANALYTICS.md`,
`FORECASTING.md`, `ALERT-SYSTEM.md`, `BRANCH-ARCHITECTURE.md`,
`AUTOMATED-REPORTS.md`, `PHASE-8-STATUS.md`.

## Files modified

- `prisma/schema.prisma`, `prisma/seed.ts` — the Phase 8 schema additions
  described above; 17 new permission catalog entries; new `SystemSetting`
  seed values for every Phase 8 configurable number.
- `src/lib/auth/permissions.ts` — 17 new `bi:*` permission keys.
- `src/lib/settings-keys.ts` — the 9 new Phase 8 `SystemSetting` keys.
- `src/config/nav.ts` — removed the old placeholder "Reports" nav item
  (and its now-unused `BarChart3` import, replaced with `TrendingUp`);
  added the "Business Intelligence" nav item and its 16-item sub-nav.
- `src/app/(app)/reports/page.tsx` — deleted; superseded by the real
  `(app)/business-intelligence/` route group built this phase (the old
  file was an empty "coming in next phase" placeholder).
- `tests/authorization.integration.test.ts` — appended a new test block
  ("Test 25") covering the 17 Phase 8 `bi:*` permissions.
- `README.md`, `ARCHITECTURE.md`, `DATABASE.md` — see "Documentation"
  above.

## Database migrations

One migration — see `DATABASE.md` "Regenerating / migrating" for the
Prisma 7 CLI flag change this phase discovered
(`--from-schema-datasource`/`--to-schema-datamodel` removed, replaced by
`--from-config-datasource`/`--to-schema`):

- `20260817170326_phase8_business_intelligence_branches_alerts` — the
  full Phase 8 schema: `Branch`, `UserBranch`, `Alert`; 5 new enums; 8
  additive `branchId` columns; `User.branchAccessMode`/`primaryBranchId`;
  10 new `AuditAction` values.

Applied cleanly on top of the existing Phase 1-7 database with zero data
loss, via the same non-interactive-environment workaround used in every
prior phase (`prisma migrate diff` → hand-placed migration folder →
`prisma migrate deploy` → `prisma generate`).

## Executive dashboard features completed

12 real-data KPI cards (`getExecutiveKpis()`); a 7-preset date selector
(Today/Yesterday/7 Days/This Month/Last Month/This Year/Custom) reusing
Phase 6's own `ReportDatePreset`/`resolveReportDateRange()`; the shared
`computeGrowth()` formula returning `NO_COMPARISON` (never a fabricated
percentage) against a zero previous period; a branch selector wherever
branch-scoped data exists. See `EXECUTIVE-DASHBOARD.md`.

## Analytics features completed

Sales (server-side `date_trunc` trend, period comparison, 6-dimension
filters), Profit (trend, by-category from the real `ProductCategory`
table, top products by units/revenue/profit), Inventory (status
breakdown, the spec's exact 5-bucket age split, slow-moving
recommendations that never auto-discount), Gold (by-purity report, rate
analytics from the real `GoldRate` table, exposure — Pure Gold Equivalent
deliberately not computed), Customer (repeat purchase rate, top
customers, average LTV, first-purchase-month cohorts), Karigar
(operational metrics only, no quality ranking), Supplier (purchase
summary, top suppliers), Cash (6-bucket breakdown, branch-scoped totals),
and Marketing (a pure rollup of Phase 7's attribution model, DIRECT and
ASSISTED always kept separate). See `ANALYTICS.md`.

## Forecasting features completed

`classifyDataSufficiency()` (configurable INSUFFICIENT_DATA/
LOW_CONFIDENCE/STANDARD_CONFIDENCE thresholds) and `projectSeries()` (a
bounded, ±5%-per-day-clamped trend projection with optional day-of-week
seasonality), shared by all five forecast types (Sales/Expense/Cash/
Inventory demand/Customer purchases). Every forecast carries `label:
"ESTIMATE"` and a `basis` string; every headline number is `null` under
INSUFFICIENT_DATA rather than a fabricated figure. See `FORECASTING.md`.

## Alert system features completed

10 generators (`generateLowStockAlerts`, `generateAgingStockAlerts`,
`generateCashShortageAlerts`, `generateGoldReconciliationAlerts`,
`generateHighBalanceAlerts`, `generateExpenseSpikeAlert`,
`generateSalesDropAlert`, `generateProfitDropAlert`,
`generateUnusualTransactionAlerts`, `generateFailedMarketingAlerts`) plus
manual `createAiRecommendationAlert()`; dedup by `(type, entityType,
entityId)`, never by run; neutral, non-accusatory wording for unusual
transactions; a full lifecycle with per-transition audit logging. See
`ALERT-SYSTEM.md`.

## Automated reports features completed

`getDailyReport()`/`getWeeklyReport()`/`getMonthlyReport()`, each
composing already-tested BI/Phase 1-6 functions; real CSV export via the
same `toCsv()` builder Phase 6 uses; `auditReportGenerated()` writing
`REPORT_GENERATED` audit rows; the `NotificationProvider` abstraction
(mock-only, no real email/WhatsApp/push integration, no personal
WhatsApp automation) and per-user JSON-backed notification preferences.
See `AUTOMATED-REPORTS.md`.

## AI insights features completed

`getBusinessInsights()` returns Metric/Period/Source/Explanation records
built entirely from numbers already-tested backend functions computed —
this file contains no call to `AiProvider` anywhere. `getBusinessInsightsAudited()`
records an `AI_INSIGHT_GENERATED` audit entry per call. See
`BUSINESS-INTELLIGENCE.md` "AI insights."

## Multi-branch foundation features completed

`Branch`/`UserBranch` models and CRUD; `resolveAuthorizedBranchIds()`/
`branchWhereClause()` branch-authorization primitives that never trust a
frontend `branchId`; 8 additive nullable `branchId` columns on existing
transactional tables (no creation-flow service function modified to
populate them — an explicit, documented scope boundary, not an
oversight); an explicit GLOBAL (Customer, Product, Category, Settings)
vs. BRANCH (Stock, Sales, Cash, Expenses, Purchases, Gold positions,
local operations) data categorization; `Customer` deliberately has no
`branchId`. See `BRANCH-ARCHITECTURE.md`.

## Permissions

17 new `bi:*` keys (`bi:dashboard_view` through `bi:settings_manage`),
matching the spec's role matrix (OWNER full access; ADMIN configured
access; MANAGER branch-level analytics; ACCOUNTANT financial analytics;
INVENTORY_MANAGER inventory/gold analytics; MARKETING_MANAGER marketing/
customer analytics; CASHIER a limited operational dashboard). Branch data
access itself is a second, independent mechanism (`branch-access.service.ts`),
not a permission key — see `ARCHITECTURE.md` "Authorization design." Only
`OWNER`/`ADMIN` are seeded with grants today, same limitation as every
prior phase.

## Tests passed

```
Vitest:      478 passed, 0 failed  (45 files — 417 Phase 1-7 + 61 Phase 8)
TypeScript:  0 errors  (tsc --noEmit)
ESLint:      0 errors, 0 warnings
Production build: succeeds cleanly (16 new Business Intelligence routes)
```

Covers all 28 requested scenarios plus the four CRITICAL TESTs specified
by the spec:

- **CRITICAL TEST (branch isolation)** — a user authorized for Branch A
  only can never see Branch B's financial data: `getBranchCashTotals()`
  excludes Branch B's cash entirely for an unscoped query, and an
  explicit request for Branch B throws `BranchAccessDeniedError`. See
  `tests/branch-access.service.integration.test.ts`.
- **CRITICAL FORECAST TEST** — insufficient sales history produces
  `forecastTotal`/`projectedCash`/`forecastOrderCount: null` across
  Sales/Expense/Cash/Customer-purchase forecasts, never a fabricated
  number. See `tests/forecast.service.integration.test.ts`.
- **CRITICAL ALERT TEST** — a −2,000 cash difference against a 1,000
  threshold produces exactly one `WARNING`-or-higher `CASH_SHORTAGE`
  alert and zero new `CashTransaction` rows. See
  `tests/alert.service.integration.test.ts`.
- **CRITICAL AI INSIGHT TEST** — `computeGrowth("1000000", "800000")`
  returns exactly the spec's expected 25% growth, UP, and
  `bi-insight.service.ts` is verified (by source-grep and by a live
  numeric-consistency check) to never independently alter a
  backend-computed figure. See `tests/bi-insight.service.test.ts`.

Plus KPI calculations, sales growth (including the zero-previous-period
edge case), profit calculations, inventory aging/slow-moving stock, gold
analytics (purity separation), customer retention/cohorts, karigar/
supplier/cash/marketing analytics smoke tests, alert generation/
thresholds/sales-drop/expense-spike detection, daily/weekly/monthly
report generation, and audit log coverage for forecasts/alerts/branches/
reports/AI insights.

## Build status

`npm run build` succeeds cleanly (Turbopack production build, including
all 16 new Business Intelligence routes). Manually/functionally verified
in a real browser via a temporary, non-committed Playwright script
against the real dev server: owner login, all 16 Business Intelligence
routes load with no page error, the Executive Dashboard shows the correct
header/KPI cards, the Forecasting page shows the "ESTIMATE" label and
never claims guaranteed/certain/100%-accurate results, the Alerts page's
"Run Alert Scan" button completes without error, the Daily Report page
has a real export control, the Branch Management page renders its
branch-list/add UI, and the Executive Dashboard has no horizontal
overflow at a 390px mobile viewport width. All 26 checks passed on the
final run (one apparent failure was a false positive in the verification
script's own regex, not a product defect — see "Known issues"). The
temporary script was deleted after use; `git status` is clean of it.

## Known issues

- **No `FAILED_PAYMENT` alert generator.** The current schema has no
  concept of a failed POS payment — a `Payment` row is only ever written
  for a successful, completed sale. The `FAILED_PAYMENT` enum value and
  UI plumbing exist and are ready, but no generator produces one yet.
  Documented explicitly in `alert.service.ts`'s own doc comment and in
  `ALERT-SYSTEM.md` "Known limitation," rather than silently omitted.
- **`bi:settings_manage` permission added as a mid-phase fix.** An
  initial draft of `bi-settings.actions.ts` incorrectly gated the general
  BI thresholds screen behind `bi:branch_manage` — a semantically wrong
  conflation of "manage branches" with "manage BI settings." Self-caught
  during development; fixed by adding a dedicated `bi:settings_manage`
  permission key, a matching seed catalog entry, and updating the action,
  then re-seeding.
- **A false positive in the manual-QC verification script, not a product
  bug.** The mobile/functional smoke script's regex-based check for
  "never claims guaranteed/certain/100% accurate" flagged the
  Forecasting page's own safety disclaimer text — "Never guaranteed,
  never certain, never 100% accurate" — because the regex didn't account
  for negation. Confirmed by inspecting the actual rendered text; the
  disclaimer is exactly correct and matches the spec's requirement. The
  script (and this false positive) were discarded, not the disclaimer.
- **No background job scheduler exists** — same limitation carried
  forward from Phase 7 — so no automated report is actually *sent* on a
  timer yet; `NotificationProvider`/`MockNotificationProvider` and
  per-user preferences are prepared, but nothing currently triggers
  `sendNotification()` automatically. See `AUTOMATED-REPORTS.md`.
- **Eight transactional models carry a `branchId` column with no
  creation-flow wiring yet** — `createInventoryItem()`, `completeSale()`,
  `createExpense()`, and every other Phase 1-7 write path still create
  rows with `branchId = null`. This is a deliberate, documented scope
  boundary (see `BRANCH-ARCHITECTURE.md` "What Phase 8 does not wire
  up"), not an oversight — every BI query can already group/filter on the
  column once a future phase adds a branch picker to each creation flow.
- **Pure Gold Equivalent is not computed** in `getGoldExposure()` — the
  spec never specifies an explicit purity-conversion rule, and inventing
  one would produce an unverifiable number. The architecture is ready
  (every purity total is already computed separately); the conversion
  itself awaits an explicit rule from a future spec. See `ANALYTICS.md`
  "Gold analytics."
- Only `OWNER` and `ADMIN` roles are seeded — every Phase 8 `bi:*`
  permission key is scoped exactly per the spec's intent, but there's no
  role-management UI yet to create the other roles and grant them (same
  limitation carried forward from every prior phase).
- No stock-transfer workflow exists between branches — `InventoryItem.branchId`
  is prepared architecture only. See `BRANCH-ARCHITECTURE.md` "Branch
  inventory."
- Everything explicitly deferred by the spec's "DO NOT BUILD YET" list
  remains out of scope: full general-ledger accounting, tax filing,
  payroll, automatic price changes, automatic product discounts,
  guaranteed AI forecasts, unapproved customer profiling, unofficial
  WhatsApp automation, automatic social-media posting, AI financial/
  trading advice, automatic stock purchasing, and complex stock-transfer
  workflows.

## Exact commands to run

```bash
npm install
cp .env.example .env        # set DATABASE_URL and AUTH_SECRET
npm run db:migrate          # applies the Phase 8 migration on top of Phase 1-7
npm run db:seed             # re-seeds permissions/settings (idempotent)
npm run dev
```

Then open `http://localhost:3000`, sign in with the credentials printed
by `db:seed`, and go to **Business Intelligence** in the sidebar — try
the Executive Dashboard, drill into any analytics page, run a Forecast,
click "Run Alert Scan" on the Alerts page, generate a Daily Report and
export its CSV, and open Branch Management to create a second branch.

## Required environment variables

No new *required* environment variables — Phase 8 ships a mock-only
notification provider that needs no credentials. No new optional
variables were introduced either; the existing Phase 7
`MARKETING_MOCK_WEBHOOK_SECRET` remains the only provider-related
environment variable in the app. When a real `NotificationProvider` is
implemented in a future phase, its credentials must be added as new
environment variables at that time — **never** committed to the
repository or referenced from any Client Component.

## Recommended Phase 9

A **role-management UI** remains the single highest-leverage next step —
eight phases have now designed fine-grained authorization boundaries
(including this phase's 17 `bi:*` keys and the branch-authorization
layer) that are still only exercisable by `OWNER`/`ADMIN`. Wiring a
**branch picker into the existing creation flows** (POS, Add Stock,
Purchases, Expenses, Karigar jobs) is the most natural Phase 8-specific
follow-up, since the `branchId` columns and authorization primitives are
already in place and waiting. A **background job scheduler** (to
actually send a daily/weekly/monthly report through a real
`NotificationProvider`, and to run the alert scan automatically instead
of only on a manual click) is the next-most-natural follow-up. Beyond
those, a real email/WhatsApp Business API/push provider implementation
(behind the `NotificationProvider` interface this phase built) and an
explicit Pure Gold Equivalent conversion rule (once the business defines
one) are both good candidates for a future phase.
