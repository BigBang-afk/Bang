# Gold & Cash Reconciliation (Phase 5), plus Financial Reconciliation (Phase 6)

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

---

## Financial Reconciliation (Phase 6)

### Two kinds of reconciliation — do not conflate them

Everything above this section is **system-vs-physical-count** reconciliation:
"does the ledger's live figure match what a human actually counted?" It
always needs a user-entered physical count as input.

`financial-reconciliation.service.ts` adds a structurally different check:
**cross-book integrity** reconciliation. "Do two independently-computed
figures for the *same fact* agree?" — no physical count involved. It exists
to catch a code bug or an out-of-band data edit (some write path that
bypassed the normal ledger-primitive functions), not day-to-day physical
drift. Both share the identical **flag, never auto-correct** policy — see
"Adjustment policy" above, which applies here unchanged: a
`FINANCIAL_INTEGRITY_ERROR` is a finding, never something this service acts
on itself.

### The seven checks

Each returns a `ReconciliationCheckResult`:
`{ status: "OK" | "FINANCIAL_INTEGRITY_ERROR", expected, actual, difference, errors[] }`.

- **`reconcileSales()`** — independently recomputes `SUM(Sale.grandTotal) -
  SUM(Payment.amount WHERE method != CREDIT)` and compares it against
  `SUM(Sale.balanceAmount)`. Matches the spec's own worked example exactly:
  Sales 1,000,000, Payments 900,000 → expected receivable 100,000; if the
  cached `balanceAmount` total says 150,000 instead, this reports
  `FINANCIAL_INTEGRITY_ERROR` with the 50,000 discrepancy spelled out.
- **`reconcileCustomerLedger()`** — delegates to the existing
  `reconcileAllCustomerBalances()` (Phase 4's `customer-ledger.service.ts`)
  rather than re-implementing the same per-customer
  cached-vs-ledger-derived check a second time.
- **`reconcileSupplierLedger()`** / **`reconcileKarigarLedger()`** — both
  built from one shared `reconcilePartyCashLedger(partyType, label)`
  helper: for every `PartyCashBalance` row, recompute
  `SUM(debit) - SUM(credit)` from that party's own `PartyCashLedgerEntry`
  rows and compare against the cached `balance` column.
  `reconcileKarigarLedger()` isn't one of the spec's six named functions,
  but came at near-zero incremental cost once the helper was shared, and
  fits the same "who-owes-whom" concern the spec's Payable Report already
  covers for karigars.
- **`reconcileGold()`** — the identical shape, per `PartyGoldBalance` row,
  against `GoldLedgerEntry`.
- **`reconcileCash()`** — recomputes the company cash balance via a fresh,
  independent raw-SQL aggregate (`SUM(IN) - SUM(OUT) + opening_balance`)
  and compares it against `getCashBalance()`'s own computed result — two
  different code paths over the same `CashTransaction` table, catching a
  divergence between them. This is deliberately not the same thing as
  `runCashReconciliation()` above (which compares the system figure to a
  *physical* till count) — `reconcileCash()` never asks for or uses a
  physical count at all.
- **`reconcileInventory()`** — verifies `InventoryItem.status` and `SaleItem`/
  `Return` stay consistent: every non-archived `SOLD` item must have
  exactly one non-returned `SaleItem`, and every non-returned `SaleItem`'s
  item must be `SOLD`. Catches a status left out of sync by a bug, not a
  spec-required workflow (`completeSale()`/`approveReturn()` are the only
  writers of both sides together).

### Running all seven

`runFullFinancialReconciliation(userId)` runs all seven checks in parallel,
computes an `overallStatus` (`OK` only if every check is `OK`), and writes
one `FINANCIAL_RECONCILIATION_PERFORMED` audit log entry recording the
overall result and how many checks failed — never the raw data itself.
Powers the Financial Reconciliation page
(`/accounting/reconciliation`, via `<RunReconciliationButton>`).

### A note on what manual testing surfaced

Running `reconcileCustomerLedger()`/`reconcileInventory()` against this
project's own shared, long-lived development database surfaces real
mismatches — traced back to *other* phases' own test fixtures that
deliberately induce a mismatch on purpose (e.g. Phase 4's
`customer-ledger.integration.test.ts` directly tampering with a stored
`outstandingBalance`, and Phase 2's
`inventory-item.service.integration.test.ts` calling
`changeInventoryItemStatus(..., "SOLD", ...)` directly, bypassing
`completeSale()`), accumulated across a great many repeated `npm test` runs
against the one persistent dev database over the course of this project.
This is the reconciliation feature working exactly as designed — flagging
a genuine cached-vs-derived mismatch — not a Phase 6 defect. See
`PHASE-6-STATUS.md` "Known issues" for the full trace.

### Permissions

`accounting:reconcile` gates running `runFullFinancialReconciliation()`;
`accounting:reports:view` is sufficient to view the page shell. `OWNER`
bypasses all checks.
