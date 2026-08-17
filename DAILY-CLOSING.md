# Daily Closing (Phase 6)

## What a closing is — and isn't

Daily Closing does not duplicate a single transaction. Every section shown
on the screen is aggregated **live**, at read time, from tables earlier
phases already own (`Sale`/`Payment`, `Expense`, `CustomerLedgerEntry`,
`PartyCashLedgerEntry`, `GoldLedgerEntry`, `CashTransaction`). The only
genuinely new data a `DailyClosing` row introduces is the user-entered
physical cash count and the closing decision itself (status, who, when,
why). `computeDailyClosingFigures(businessDate)`
(`daily-closing.service.ts`) is the single read-only function that builds
every section; it is used both for the pre-submit preview and internally
by `submitDailyClosing()`, so what a user previews is exactly what gets
recorded.

## Business date

`businessDate` is always resolved in the configured business timezone
(`business.timezone`, default `Asia/Karachi` — see `ACCOUNTING.md`
"Business date & timezone"), never the browser's or server's local
calendar day. A `DailyClosing` row is `@unique` on `businessDate` — one
closing per business date, ever.

## Sections

| Section          | Built from                                                    |
| ----------------- | -------------------------------------------------------------- |
| **Sales**          | `Sale`/`Payment` for the day: total, cash/card/bank/credit split, refunds (approved returns processed that day) |
| **Payments Received** | `CashTransaction` (`direction: IN`, `SALE_PAYMENT`/`CUSTOMER_PAYMENT`), by payment method |
| **Expenses**        | `CashTransaction` (`direction: OUT`, `EXPENSE`), by payment method |
| **Cash**            | The daily cash formula — see below |
| **Gold**            | Per-purity: sold/purchased (from `SaleItem`/`PurchaseItem`), given/received/returned/adjusted (from `GoldLedgerEntry`) — purities are never combined, same rule as everywhere else gold is reported |
| **Receivables**      | Opening/closing customer receivable (via historical-balance reconstruction), new credit sales, payments received |
| **Payables**         | Same shape as Receivables, scoped to `PartyType.SUPPLIER` |

## The daily cash formula

```
Opening Cash + Cash Received − Cash Paid + Cash Adjustments = Expected Closing Cash
```

- **Opening Cash** — the company cash book's balance (`getCashBalanceAsOf()`,
  `historical-balance.service.ts`) at the exact instant the business day
  began, reconstructed from `CashTransaction` history — not a cached or
  hand-entered number.
- **Cash Received / Cash Paid** — every `CashTransaction` for the day
  excluding `CASH_ADJUSTMENT` rows, split by `direction`.
- **Cash Adjustments** — `CASH_ADJUSTMENT` transactions (e.g. a void's
  compensating entry) are broken out into their **own** bucket rather than
  folded into Received/Paid, so a correction is always visible as a
  correction, not hidden inside an ordinary sales/expense figure.
- **Expected Closing Cash** — the formula's result.
- **Physical Cash** — a user-entered count, submitted at closing time.
- **Cash Difference** = `Physical Cash − Expected Closing Cash`. Negative =
  **shortage**, positive = **excess**. This value is **never auto-adjusted**
  — it's stored and surfaced (`"CASH SHORTAGE: Rs. X"` /
  `"CASH EXCESS: Rs. X"`) for a human to review and act on separately (a
  reconciliation adjustment, an investigation, a note — never an automatic
  correcting entry from this flow).

### A note on the spec's own worked example

The Phase 6 spec's DAILY CLOSING TEST worked example (Opening 100,000 +
Cash Sales 300,000 + Customer Payments 100,000 − Cash Expenses 50,000 −
Supplier/Karigar Cash Payments 100,000) states an "Expected Closing Cash"
of 250,000 — but summing its own stated components
(100,000 + 300,000 + 100,000 − 50,000 − 100,000) gives 350,000, not
250,000. This is an arithmetic inconsistency in the spec's example itself,
not an ambiguity in the formula. The implementation applies the formula
exactly as stated (`Opening + Received − Paid + Adjustments = Expected`)
consistently; `tests/daily-closing.service.integration.test.ts`'s CRITICAL
DAILY CLOSING TEST verifies the formula and the shortage-detection/
never-auto-adjust *behavior* — "physical is 2,000 below whatever the real
expected figure is → a −2,000 difference is reported and nothing is
auto-corrected" — using a controlled offset technique (submitting
`physicalCashAmount = expected − 2000` against the real, live computed
`expected`) rather than trying to reproduce the spec's own inconsistent
absolute numbers. See `PHASE-6-STATUS.md` "Known issues" for the full
detail.

## Unresolved issues checklist

Before a closing can go straight to `CLOSED`, `getUnresolvedClosingIssues()`
checks:

- **Pending cash reconciliation** — no `CashReconciliation` row yet, or the
  latest one is `RECONCILIATION_REQUIRED` (Phase 5).
- **Pending gold reconciliation**, per purity — same check against
  `GoldReconciliation`.
- **Failed transactions** — always 0. This codebase's transactional design
  (every multi-step write happens inside a single `$transaction`) means a
  failed operation never persists a partial row — there is nothing to
  count. Reported explicitly rather than silently omitted, so the checklist
  UI always shows every category the spec names.
- **Unapproved adjustments** — always 0, for the same reason: every
  adjustment function (`recordGoldAdjustment`, `recordPartyCashAdjustment`,
  `recordCashAdjustment`) writes immediately; there is no queued-for-
  approval state in this codebase to check.
- **Open returns** — `Return` rows still in `RETURN_REQUESTED`.
- **Unpaid balances** — only checked when
  `accounting.flag_unpaid_balances_on_closing` is enabled (default `false`);
  counts customers/parties with an outstanding balance.

If any of these are true, `hasIssues = true` and submitting saves the day
as `PENDING_REVIEW` instead of closing it immediately — see "Workflow"
below. The exact checklist snapshot at submit time is stored in
`DailyClosing.unresolvedIssues` (jsonb) for audit, even though the
underlying conditions may later change.

## Workflow

States (`DailyClosingStatus`): `OPEN` (implicit — no row exists yet) →
`PENDING_REVIEW` or `CLOSED` → `REOPENED` → (resubmit) → ...

1. **`submitDailyClosing({ businessDate, physicalCashAmount, notes? }, userId)`**
   — computes the figures, computes the difference, and:
   - If `hasIssues` is false: closes immediately (`status: CLOSED`,
     `closedById`/`closedAt` set in the same call).
   - If `hasIssues` is true: saves as `PENDING_REVIEW` — a human must
     explicitly review the checklist before it can close.
   - Rejects a negative physical cash amount
     (`InvalidPhysicalCashAmountError`) and re-submitting an already-`CLOSED`
     day (`DailyClosingAlreadyClosedError` — reopen it first).
   - Writes a `DAILY_CLOSING_SUBMITTED` audit entry, plus a `DAY_CLOSED`
     entry if it closed immediately.
2. **`confirmDailyClosing(businessDate, userId)`** — closes a
   `PENDING_REVIEW` day after a human has reviewed its issues
   (`DailyClosingNotPendingReviewError` if called on any other status).
   Writes `DAY_CLOSED`.
3. **`reopenDailyClosing({ businessDate, reason }, userId)`** — only from
   `CLOSED`, only with a non-empty `reason`
   (`EmptyReopenReasonError`/`DailyClosingNotClosedError`), gated by the
   narrower `accounting:daily_closing:reopen` permission (OWNER/an
   explicitly authorized manager only — see `ACCOUNTING.md`
   "Permissions"). Sets `status: REOPENED`, `reopenedById`, `reopenedAt`,
   `reopenReason`. Writes `DAY_REOPENED`. A reopened day can be
   re-submitted via step 1 again.

## Permissions

`accounting:daily_closing` gates `submitDailyClosing()`/
`confirmDailyClosing()`; `accounting:daily_closing:reopen` gates
`reopenDailyClosing()` specifically — a deliberately narrower grant, since
the spec restricts reopening to OWNER/an authorized manager while ordinary
submission is available to a wider set of roles (including CASHIER).
`accounting:reports:view` is sufficient to read past closings
(`listRecentDailyClosings()`, `getDailyClosingByDate()`). `OWNER` bypasses
all checks.
