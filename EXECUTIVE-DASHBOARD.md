# Executive Dashboard (Phase 8)

`(app)/business-intelligence/page.tsx` — the Business Intelligence
module's landing page. See `BUSINESS-INTELLIGENCE.md` for the module
overview and `ANALYTICS.md` for the individual analytics pages this
dashboard links out to.

## Header and date selector

The header reads "ZARGHOON JEWELLERS / Business Intelligence" (an exact
literal string check every functional test/manual QC pass asserts). A
date-range selector offers the spec's exact preset list — Today,
Yesterday, 7 Days, This Month, Last Month, This Year, Custom — implemented
via the same `ReportDatePreset` type and `resolveReportDateRange()`
resolver every Phase 6 report page already uses, so a Custom range
resolves identically everywhere in the app.

## The 12 top KPI cards

`bi-dashboard.service.ts`'s `getExecutiveKpis()` returns:

- Today's Sales, Today's Gross Profit, Today's Net Profit
- This Month's Sales, This Month's Gross Profit, This Month's Net Profit
- Cash Balance (live, from `cash-transaction.service.ts`'s
  `getCashBalance()`)
- Customer Receivables (aggregate `Customer.outstandingBalance`)
- Supplier Payables (aggregate `PartyCashBalance` where `partyType =
  SUPPLIER` and `balance > 0`)
- Gold With Karigars (per-purity array — never summed across purities)
- Inventory Cost Value and Inventory Selling Value (from
  `getInventoryValuationReport()`)

Every figure is a `Decimal`-derived string composed from an existing
Phase 1-6 service call — this file introduces no new source of truth for
money or gold. See `ARCHITECTURE.md`'s `bi-dashboard.service.ts` bullet.

## Growth indicators

`computeGrowth(current, previous)` is the one shared formula every
period-comparison on this dashboard (and every other BI analytics page)
uses: `(current − previous) / previous × 100`. When `previous` is zero,
it returns `growthPercent: null` and `direction: "NO_COMPARISON"` —
**never** a divide-by-zero `Infinity` and never a silently-wrong `0%`. The
`<GrowthIndicator>` component (`src/components/business-intelligence/`)
renders `direction` as UP/DOWN/NO COMPARISON text with an appropriate
icon, so a zero-previous-period comparison is visually unmistakable from a
real 0% (FLAT) result. See `ARCHITECTURE.md`'s `computeGrowth()` bullet
and the CRITICAL AI INSIGHT TEST in `tests/bi-insight.service.test.ts`,
which uses this exact function with the spec's own example figures.

## Quick overview vs. detailed analytics

The Executive Dashboard itself only shows the 12 KPI cards, growth
indicators, and the open-alerts count — it deliberately does not
duplicate every chart from every sub-page. Each KPI card and the alerts
summary link out to the matching detailed analytics page (Sales, Profit,
Inventory, Gold, ...), keeping the landing screen scannable rather than
overloaded, per the spec's explicit "do not overload the screen"
instruction.

## Mobile responsiveness

KPI cards reflow to a single column below the `md` breakpoint using the
same Tailwind grid pattern as every other dashboard in the app (see
`ARCHITECTURE.md`'s design-system notes). Sales, Profit, Cash, Gold, and
Alerts are the cards prioritized to appear first in the mobile stacking
order, per the spec's explicit mobile-priority list. Verified with a
390×844 viewport check during Phase 8 manual QC — no horizontal overflow.
See `PHASE-8-STATUS.md` "Build status."

## Branch selector

The Executive Dashboard renders company-wide totals by default. A branch
selector (server-side filtered — never a frontend-only filter) is
available wherever branch-scoped BI data exists (see
`bi-cash-analytics.service.ts`'s `getBranchCashTotals()`); selecting a
specific branch always passes through `branchWhereClause()`, so a user
without access to that branch gets `BranchAccessDeniedError` rather than
silently-wrong data. See `BRANCH-ARCHITECTURE.md` "Branch dashboard."
