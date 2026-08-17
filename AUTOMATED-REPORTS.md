# Automated Reports (Phase 8)

`bi-report.service.ts`, surfaced at `(app)/business-intelligence/reports/daily/`,
`reports/weekly/`, and `reports/monthly/`. See `BUSINESS-INTELLIGENCE.md`
for the module overview; this file covers report content, CSV export, and
the owner-notification architecture prepared alongside it.

## Daily report

`getDailyReport(businessDate)` returns Sales, Gross Profit, Net Profit,
Expenses (all from `getProfitAndLoss("custom", {from, to})` for that exact
business day), Gold Sold by purity (from `getSalesReport()`), New
Customers that day, and the current Open Alerts count. Matches the
spec's example "TODAY'S SUMMARY" line-item format.

## Weekly report

`getWeeklyReport()` returns Sales/Gross Profit/Expenses for the current
week plus `salesGrowth` (`computeGrowth()` against the nearest comparable
full period — `last_month`, since no dedicated `last_week` preset exists
in `ReportDatePreset` today; documented here rather than silently
approximated), Top Products, Top Customers, Inventory status, Gold by
purity, Marketing summary, Cash analytics, and the Open Alerts count.

## Monthly report

`getMonthlyReport()` returns Revenue, COGS, Gross Profit, Gross Margin %,
Expenses, Net Profit, Net Margin % (all from `getProfitAndLoss()`),
`salesGrowth` and `customerGrowth` (both via `computeGrowth()`, the
latter comparing this month's new customers against last month's, never a
negative or invented figure), Profit by Category, Inventory status, Gold
by purity, Cash analytics, and Marketing summary — matching the spec's
full monthly line-item list (Revenue/COGS/Gross Profit/Expenses/Net
Profit/Margins/Sales growth/Customer growth/Inventory/Gold/Cash/
Marketing).

## Report generation is real, not a placeholder

Every report is assembled from real database aggregates via already-tested
BI/Phase 1-6 service functions — nothing in `bi-report.service.ts`
computes a figure a second, independent way from what the corresponding
analytics page already shows. `dailyReportToCsv()` produces a genuine
RFC 4180 CSV via `src/lib/csv.ts`'s `toCsv()` — the exact same builder
every Phase 6 report export already uses — wired to a real
`<ExportCsvButton>` on the Daily Report page. There is no fake "Download
PDF" button anywhere: PDF export is explicitly **prepared architecture,
not implemented** — the report data shape is already a plain serializable
object, ready for a future `@react-pdf/renderer` template (the same
library Phase 3's `INVOICE-SYSTEM.md` already uses for invoices), but no
such template exists yet.

## Audit log

`auditReportGenerated(userId, reportType)` writes a `REPORT_GENERATED`
audit log entry (`entity: "BiReport"`, `metadata: {reportType}`) every
time a report is generated — see `tests/bi-report.service.integration.test.ts`
"Test 28."

## Owner notification architecture

`src/services/notification/notification-provider.ts` defines
`NotificationProvider` (`sendNotification({to, channel, kind, subject,
body})`) — the same interface-plus-mock-plus-singleton-resolver shape
Phase 7's `AiProvider`/`MarketingProvider` established.
`NotificationChannel` is `EMAIL`/`WHATSAPP`/`PUSH`; `NotificationKind`
covers `DAILY_REPORT`, `CRITICAL_ALERT`, `CASH_SHORTAGE`,
`GOLD_DISCREPANCY`, `MAJOR_EXPENSE`, `SALES_DROP`, and `INVENTORY_ALERT`
— matching the spec's exact configurable-notification list.
`MockNotificationProvider` is the only implementation Phase 8 ships — no
real email/WhatsApp Business API/push integration exists, and in
particular **no personal WhatsApp account automation of any kind**, per
the spec's explicit instruction not to hardcode that. A real provider
plugs in later behind the same interface, exactly like every prior
phase's provider abstraction.

### Notification preferences

`notification-preferences.service.ts` reads/writes each user's
notification preferences as a single JSON `SystemSetting` row
(`bi.notification_prefs.<userId>`) rather than a new table — a deliberate
scope decision for a small, per-user JSON blob with no query need beyond
"read this one user's row," following the established "settings as data"
pattern (see `ARCHITECTURE.md`). Every notification a provider would send
must respect the receiving user's own preferences and their existing RBAC
permissions — a user is never notified about data they aren't otherwise
authorized to see.

### What Phase 8 does not build

Per the spec's explicit "DO NOT BUILD YET" list: no background job
scheduler exists to actually *send* a scheduled daily report — the
notification/report-delivery architecture (provider interface, mock,
preferences) is prepared, but nothing currently triggers
`sendNotification()` on a timer. Wiring a scheduler is a natural, additive
follow-up once a real provider exists to send through.
