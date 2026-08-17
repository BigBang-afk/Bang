# Alert System (Phase 8)

`alert.service.ts`, surfaced at `(app)/business-intelligence/alerts/page.tsx`
via `<AlertsList>` and `<RunAlertScanButton>`
(`src/components/business-intelligence/`). See `ARCHITECTURE.md` "The
alert-dedup-by-entity pattern" for the implementation detail behind
re-run safety; this file covers the alert model, the 10 generators, and
the lifecycle.

## The Alert model

`type` (12 values), `severity` (`INFO`/`WARNING`/`HIGH`/`CRITICAL`),
`title`, `description`, `entityType`/`entityId` (what the alert concerns),
`branchId` (nullable — a company-wide alert has none), `status`
(`OPEN`/`ACKNOWLEDGED`/`RESOLVED`/`DISMISSED`), `createdAt`, and
`resolvedById`/`resolvedAt` (set on whichever of
ACKNOWLEDGED/RESOLVED/DISMISSED last moved the alert away from `OPEN`).
See `DATABASE.md` "`Alert` *(Phase 8)*".

## The 12 alert types, and which have a generator

| Type | Generator | Notes |
| --- | --- | --- |
| `LOW_STOCK` | `generateLowStockAlerts()` | category-count threshold **or** specific-SKU availability, never a standard-retail quantity assumption |
| `AGING_STOCK` | `generateAgingStockAlerts()` | reads the same 180+ day bucket `getInventoryAgeBuckets()` computes |
| `CASH_SHORTAGE` | `generateCashShortageAlerts(businessDate)` | compares a `DailyClosing.cashDifference` against `BI_CASH_SHORTAGE_THRESHOLD` |
| `GOLD_RECONCILIATION` | `generateGoldReconciliationAlerts()` | reads existing `GoldReconciliation` rows, never recomputes the reconciliation itself |
| `SUPPLIER_PAYABLE_HIGH` / `CUSTOMER_RECEIVABLE_HIGH` | `generateHighBalanceAlerts()` | one function, two outcome counts (`{payables, receivables}`) against `BI_HIGH_BALANCE_THRESHOLD` |
| `EXPENSE_SPIKE` | `generateExpenseSpikeAlert()` | current vs. historical average, `BI_EXPENSE_SPIKE_PERCENT` threshold |
| `SALES_DROP` | `generateSalesDropAlert()` | current vs. previous comparable period, `BI_SALES_DROP_PERCENT` threshold |
| `PROFIT_DROP` | `generateProfitDropAlert()` | same comparable-period logic, applied to net profit |
| `UNUSUAL_TRANSACTION` | `generateUnusualTransactionAlerts(sinceHours)` | rule-based (large discount/expense/refund/cash adjustment against `BI_UNUSUAL_TRANSACTION_AMOUNT`), **never** an accusation — see "Neutral wording" below |
| `FAILED_MARKETING` | `generateFailedMarketingAlerts(limit)` | reads `CampaignMessage` failure states from Phase 7 |
| `FAILED_PAYMENT` | *(none)* | see "Known limitation" below |
| `AI_RECOMMENDATION` | `createAiRecommendationAlert(input)` | created manually by a caller (e.g. a follow-up recommendation), not part of the scheduled scan |

`runAllAlertGenerators(businessDate)` runs the 10 scan-based generators in
parallel and returns the total count created — this is what the "Run
Alert Scan" button on the Alerts page triggers.

### Known limitation: no `FAILED_PAYMENT` generator

The current schema has no concept of a *failed* POS payment — a `Payment`
row is only ever written for a successful, completed sale (see
`SALES.md`). There is therefore no real data source to generate a
`FAILED_PAYMENT` alert from yet; the enum value and UI plumbing exist and
are ready, but no generator produces one. This is an honest gap, not a
silent omission — `runAllAlertGenerators()`'s own doc comment states it
explicitly.

## Severity and never over-using CRITICAL

`INFO`/`WARNING`/`HIGH`/`CRITICAL`, chosen per-generator based on how far
past the configured threshold the underlying figure is (e.g. a cash
shortage well beyond the threshold escalates from `WARNING` toward
`HIGH`/`CRITICAL`). No generator defaults to `CRITICAL` — it's reserved
for genuinely severe cases, per the spec's explicit "do not use CRITICAL
unnecessarily" instruction.

## Neutral wording for `UNUSUAL_TRANSACTION`

`generateUnusualTransactionAlerts()`'s titles read literally "Large
discount/expense/cash adjustment — transaction requires review." The
description never names a suspected cause, never says "fraud," and never
addresses a specific staff member accusatorially — it states a fact
(a transaction exceeded a configured threshold) and asks for review,
exactly per the spec's explicit instruction.

## Dedup: by entity, not by run

`createAlertIfNotDuplicate()` only skips creating a new alert when an
`OPEN` alert already exists for the exact same `(type, entityType,
entityId)` triple. Re-running any generator — or clicking "Run Alert Scan"
repeatedly — can never create a duplicate `OPEN` alert for the same
underlying condition, and it will immediately raise a fresh one the moment
a previously-resolved condition recurs. See `ARCHITECTURE.md` "The
alert-dedup-by-entity pattern."

## Lifecycle

`OPEN → ACKNOWLEDGED → RESOLVED`, or `OPEN → DISMISSED` directly.
`acknowledgeAlert()`/`resolveAlert()`/`dismissAlert()` each record
`resolvedById`/`resolvedAt` and write an `ALERT_ACKNOWLEDGED`/
`ALERT_RESOLVED`/`ALERT_DISMISSED` audit log entry. None of the three
functions ever touches the underlying transaction the alert flags — a
`CASH_SHORTAGE` alert being resolved never adjusts a `CashTransaction`
row, a `LOW_STOCK` alert being dismissed never creates a purchase order.
See the CRITICAL ALERT TEST in `tests/alert.service.integration.test.ts`,
which asserts a −2,000 cash difference against a 1,000 threshold produces
exactly one `WARNING`-or-higher alert and **zero** new `CashTransaction`
rows.

## Permissions

`bi:alerts_view` gates the Alerts page and list; `bi:alerts_manage` gates
acknowledge/resolve/dismiss and the "Run Alert Scan" button — a user who
can see alerts is not automatically allowed to change their status.
