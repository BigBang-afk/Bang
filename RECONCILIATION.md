# Gold & Cash Reconciliation (Phase 5)

## Policy — flag, never auto-correct

Reconciliation exists to answer "does what the system thinks we have match
what's physically counted" — never to silently fix a mismatch.
`runGoldReconciliation()` and `runCashReconciliation()`
(`src/services/reconciliation.service.ts`) both follow the same three
steps, and **neither ever calls any ledger-adjustment function**:

1. Compute the live system figure.
2. Compare it to a user-entered physical count.
3. Classify and persist the comparison as a new row. That's it.

Applying a fix is always a **separate, later, explicit** action — a human
decides to run `recordGoldAdjustment()` or `recordPartyCashAdjustment()` /
`recordCashAdjustment()` afterward, as its own deliberate step. This is
verified directly: `tests/cash-reconciliation.integration.test.ts`'s
"RECONCILIATION TEST" asserts both that a mismatch is correctly flagged
*and* that the underlying ledger entry count and system weight are
completely unchanged immediately after reconciling.

## Gold reconciliation

`runGoldReconciliation({ purity, physicalWeight, notes? }, userId)`:

1. `systemWeight = getSystemGoldWeightForPurity(purity)` —
   `SUM(ABS(PartyGoldBalance.balance))` across every karigar/supplier for
   that purity (see "System Gold scope" below).
2. `difference = physicalWeight - systemWeight`, exact, **no tolerance** —
   this is a different, stricter check than the karigar job's wastage
   tolerance (`KARIGAR-SYSTEM.md`), which exists for a completely different
   purpose (accepting normal making-process loss on one job, not
   accepting an unexplained shop-wide gold discrepancy).
3. `status = difference === 0 ? "MATCHED" : "RECONCILIATION_REQUIRED"`.
4. Persist a `GoldReconciliation` row; write a
   `GOLD_RECONCILIATION_COMPLETED` audit log entry.

### System Gold scope (a documented limitation)

"System Gold" is scoped specifically to gold currently tracked in a
karigar/supplier ledger — i.e. gold that is "out" somewhere accounted for.
Phase 5 does **not** model a separate raw/loose shop-gold inventory that
hasn't yet been allocated to a specific party. A physical count that
includes untracked loose shop gold will therefore always show as a
mismatch against this system figure — that is expected, not a bug, given
the phase's scope. A future phase could add a dedicated shop-gold-stock
concept if that becomes a real operational need.

## Cash reconciliation

`runCashReconciliation({ physicalAmount, notes? }, userId)`:

1. `systemAmount = getCashBalance()` — the company cash book's live
   balance (`CASH-MANAGEMENT.md`).
2. `difference = physicalAmount - systemAmount`, exact, no tolerance.
3. `status = difference === 0 ? "MATCHED" : "RECONCILIATION_REQUIRED"`.
4. Persist a `CashReconciliation` row; write a
   `CASH_RECONCILIATION_COMPLETED` audit log entry.

Both reconciliation types share the same `ReconciliationStatus` enum
(`MATCHED` / `RECONCILIATION_REQUIRED`) — one shared vocabulary for "does
this match" across gold and cash, even though the two are never compared
to each other or combined into a single number.

## Adjustment policy — the separate, explicit step

A `RECONCILIATION_REQUIRED` result is a finding, not a fix. Whoever
reviews it decides, as a distinct action:

- **Gold**: `recordGoldAdjustment()` — requires an explicit
  `direction: "debit" | "credit"` and a description; posts against a
  specific party+purity, not against "the system" abstractly (a shop-wide
  gold mismatch still has to be resolved as *some* party's balance
  correction, or investigated further before any entry is posted at all).
- **Cash**: `recordPartyCashAdjustment()` (party-scoped) or
  `recordCashAdjustment()` (company cash book, requires a non-empty
  reason).

None of these are called automatically by the reconciliation run itself,
by a schedule, or by any other service — a human always makes the call.

## History

`listGoldReconciliations()` / `getLatestGoldReconciliationByPurity()` and
`listCashReconciliations()` / `getLatestCashReconciliation()` provide the
full audit trail of every reconciliation ever run, powering
`/gold-ledger/reconciliation` and `/cash-management/reconciliation`.

## Permissions

`gold_ledger:reconcile` and `cash:reconcile` gate running a reconciliation;
`gold_ledger:view`/`cash:view` are sufficient to read the history.
`OWNER` bypasses all checks; `ADMIN` is seeded with every Phase 5
permission.
