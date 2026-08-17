# Karigar Management & Wastage Reconciliation (Phase 5)

## What a Karigar is

A job-work craftsman the business gives raw gold to and receives finished
(or semi-finished) pieces back from. `Karigar` (`src/services/karigar.service.ts`)
is deliberately shaped like `Customer` (Phase 4): a `ZJK-NNNNNN` code, a
unique `phone`, a `status` that is changed, never deleted, and an
identical create/update/status-change/search/list surface.

| Field            | Notes                                                     |
| ----------------- | ---------------------------------------------------------- |
| `codeSequence`    | `ZJK-000001`, derived from a real Postgres autoincrement column at read time (`src/lib/karigar-code.ts`), same pattern as `Customer.customerCode`/`Barcode`/`Invoice` |
| `specialization`  | `CASTING`, `SETTING`, `POLISHING`, `ENGRAVING`, `GENERAL`, `OTHER` |
| `status`          | `ACTIVE`, `INACTIVE`, `BLOCKED` — `BLOCKED` prevents new gold jobs (`KarigarBlockedError`), existing jobs/history are untouched |

A Karigar is **never hard-deleted**. `changeKarigarStatus()` is the only
status-change path and always writes a `KARIGAR_STATUS_CHANGED` audit log
entry with the old and new status.

## Wastage reconciliation — the job-work cycle

The core Phase 5 requirement: give raw gold, receive finished pieces back,
and **never silently absorb the difference into "wastage."** This is
modeled as a `KarigarGoldJob` (`src/services/karigar-job.service.ts`).

### 1. Give gold — `giveGoldToKarigar(input, userId)`

```ts
{ karigarId, purity, givenWeight, expectedWeight, description? }
```

1. Loads the karigar; rejects if missing (`KarigarNotFoundForJobError`) or
   `BLOCKED` (`KarigarBlockedError`).
2. Rejects a non-positive `givenWeight`/`expectedWeight`
   (`InvalidGoldWeightError`).
3. Pre-generates `jobId = crypto.randomUUID()` client-side — this solves a
   chicken-egg schema dependency: the `KarigarGoldJob` row needs to store
   the ledger entry's id, and the ledger entry's `referenceId` needs the
   job's id. Pre-generating the job id means the job row can be created
   first (`givenLedgerEntryId: null`), then the `GoldLedgerEntry` created
   referencing `jobId`, then the job updated with the entry's real id — all
   inside one transaction.
4. Calls `appendGoldLedgerEntry()` (`GOLD_GIVEN`, debit) — see
   `GOLD-LEDGER.md`.
5. Writes a `GOLD_GIVEN` audit log entry after commit.

### 2. Receive gold — `receiveGoldFromKarigar(input, userId)`

```ts
{ jobId, receivedWeight, description? }
```

1. Loads the job; rejects if missing (`GoldJobNotFoundError`) or already
   received (`GoldJobAlreadyReceivedError`) — **a job can only be received
   once**.
2. Computes `differenceWeight = expectedWeight - receivedWeight` and
   **stores it verbatim** — this number is never recalculated, rounded
   away, or merged into any other field.
3. Classifies the difference against a configurable tolerance (see below),
   sets `reconciliationStatus`.
4. Calls `appendGoldLedgerEntry()` (`GOLD_RECEIVED`, credit) for the
   `receivedWeight` actually returned — not the expected weight.
5. Writes `GOLD_RECEIVED` and `GOLD_JOB_COMPLETED` audit log entries after
   commit.

### Classification — `classifyDifference()`

Tolerance is read from `SystemSetting` key
`karigar.wastage_tolerance_grams` (default `"0.100"`) at receive time, and
**snapshotted** onto the job row (`toleranceGramsSnapshot`) — a later
change to the setting never retroactively reclassifies a job that was
already received.

| Condition                          | Status              |
| ------------------------------------ | --------------------- |
| `\|difference\| <= tolerance`        | `WITHIN_ALLOWANCE`    |
| `difference > tolerance`  (received less than expected) | `SHORTAGE` |
| `difference < -tolerance` (received more than expected) | `EXCESS_DIFFERENCE` |

### The critical worked example (given 10.000g, received 9.700g)

| Step | Action | Result |
| ---- | ------ | ------ |
| 1 | `giveGoldToKarigar({ givenWeight: 10.000, expectedWeight: 10.000 })` | job created, `GOLD_GIVEN` debit posted |
| 2 | `receiveGoldFromKarigar({ jobId, receivedWeight: 9.700 })` | `differenceWeight = 0.300`, `reconciliationStatus = SHORTAGE` (tolerance 0.100), `GOLD_RECEIVED` credit posted for 9.700 only |
| 3 | `classifyGoldJobDifference(jobId, "Approved wastage", userId)` | annotation only — `givenWeight`/`receivedWeight`/`differenceWeight` are **untouched** |
| 4 | `recordGoldAdjustment(...)` (a separate, explicit call — see `GOLD-LEDGER.md`) | actually settles the remaining 0.300g against the karigar's gold balance |

Steps 3 and 4 are deliberately separate functions: classifying a
difference is a human note ("we're treating this as normal wastage, not a
shortfall to chase"), and never by itself changes any balance. Only an
explicit `recordGoldAdjustment()` call — a second, distinct decision —
moves gold. `tests/gold-ledger.integration.test.ts`'s "CRITICAL TEST"
verifies both: the difference stays `0.300` after classification, and the
balance is zero only after the adjustment.

## Karigar Cash — `karigar-cash.service.ts`

`recordKarigarCashTransaction()` composes `appendPartyCashLedgerEntry()`
(`CASH_PAID` → credit / `CASH_RECEIVED` → debit) with
`recordCashTransactionInTx()` (`KARIGAR_PAYMENT`/`OUT` or
`KARIGAR_RECEIPT`/`IN`) in one transaction — a labor charge paid to a
karigar, or an advance/refund received from one. See `CASH-MANAGEMENT.md`
for the payable/receivable convention.

## Karigar Profile

`[id]/page.tsx` renders six tabs (Overview, Gold Ledger, Cash Ledger, Jobs,
Transactions, Notes), each pre-rendered server-side and handed to a
`"use client"` `<KarigarProfileTabs>` wrapper purely for tab switching —
identical to the Customer profile pattern from Phase 4, for the same
reason (avoiding the Prisma `Decimal` Server→Client boundary pitfall — see
`ARCHITECTURE.md`).

## Navigation

All Karigars, Add Karigar, Karigar Ledger (company-wide cash ledger), Gold
With Karigar (company-wide gold position), Cash With Karigar (company-wide
cash position) — `KARIGARS_SUB_NAV` in `src/config/nav.ts`.

## Permissions

| Key                | Grants                                              |
| -------------------- | ------------------------------------------------------ |
| `karigars:view`     | read karigar list/profile/ledgers                    |
| `karigars:manage`   | create/edit/status-change a karigar                   |
| `karigars:gold`     | give/receive gold, classify a difference               |
| `karigars:cash`     | record karigar cash payments/receipts                  |

`OWNER` bypasses all checks; `ADMIN` is seeded with every Phase 5
permission. See `ARCHITECTURE.md` "Authorization design".

## Search & filtering

`searchKarigars()` (typeahead, capped result set) and `listKarigars()`
(paginated, filterable by `status`/`specialization`, sortable) — same
shape as the Phase 4 customer search/list pair.
