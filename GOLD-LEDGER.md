# Gold Ledger (Phase 5)

## The primitive — one write path, everywhere

`appendGoldLedgerEntry(tx, input)` (`src/services/gold-ledger.service.ts`)
is the **only** function in the codebase allowed to change a
`PartyGoldBalance` row. Same architecture as the Phase 4 customer-ledger
primitive:

```ts
export async function appendGoldLedgerEntry(
  tx: Prisma.TransactionClient,
  input: GoldLedgerEntryInput, // { partyType, partyId, purity, transactionType, referenceType, referenceId, debit?, credit?, goldRatePerGram?, goldValue?, description?, createdById }
): Promise<{ id: string; balanceAfter: Prisma.Decimal }>
```

1. **`adjustPartyGoldBalanceInTx(tx, ...)`** — one atomic
   `INSERT ... ON CONFLICT (partyType, partyId, purity) DO UPDATE SET
   balance = balance + delta ... RETURNING balance`, where
   `delta = debit - credit`. The `@@unique([partyType, partyId, purity])`
   constraint on `PartyGoldBalance` is what makes the upsert well-defined,
   and — because it's a single statement — Postgres's row lock serializes
   two concurrent writers to the same party+purity automatically.
2. **Create the `GoldLedgerEntry` row** using the exact value the upsert
   just returned as `balanceAfter`.

## The party is polymorphic — one ledger, two party types

`partyType: "KARIGAR" | "SUPPLIER"` plus `partyId` (not a foreign key,
deliberately — the same pattern `AuditLog.entity`/`entityId` already uses)
means karigars and suppliers share one ledger table and one balance table.
There is no `if (partyType === "KARIGAR")` branch anywhere in
`gold-ledger.service.ts` — one sign convention has to work correctly for
both, despite the two being conceptually opposite relationships (a
karigar is typically given gold and returns it; a supplier typically gives
gold to the business on consignment).

## Sign convention

| Transaction type    | Direction | Effect on `balance`        |
| ---------------------- | ----------- | ----------------------------- |
| `GOLD_GIVEN`           | debit       | raises the party's balance   |
| `GOLD_RETURNED`        | debit       | raises the party's balance   |
| `GOLD_RECEIVED`        | credit      | lowers the party's balance   |
| `GOLD_ADJUSTMENT`      | caller-specified (`direction: "debit" \| "credit"`) | either — no natural default for a manual correction |
| `GOLD_TRANSFER`        | one credit (source) + one debit (destination), two linked entries in one transaction | — |

`balanceAfter > 0` → the party **`HOLDS_GOLD`** — the business is owed
that much gold back. `balanceAfter < 0` → the party **`OWES_GOLD`** — the
business currently holds (or owes the value of) that much gold belonging
to the party. `balanceAfter === 0` → **`SETTLED`**.

### Why this works for both karigar and supplier flows

- **Karigar**: `giveGoldToKarigar()` calls `appendGoldLedgerEntry()` with
  `GOLD_GIVEN` (debit) — the karigar's balance goes positive, correctly
  meaning "the karigar holds our gold, they owe it back."
  `receiveGoldFromKarigar()` calls it again with `GOLD_RECEIVED` (credit) —
  the balance comes back down as gold is returned.
- **Supplier**: receiving raw gold from a supplier on consignment calls
  the *same* function with `GOLD_RECEIVED` (credit) — the supplier's
  balance goes **negative**, correctly meaning "we now hold gold (or its
  value) that belongs to the supplier, we owe it back" (`OWES_GOLD`).

Both directions are verified by dedicated tests in
`tests/gold-ledger.integration.test.ts`.

## Purity is never combined

Every balance, every ledger entry, every position read is scoped to one
`GoldPurity` (`@@unique([partyType, partyId, purity])` on
`PartyGoldBalance`). A karigar who holds 5g of 22K and owes 2g of 21K has
**two** rows, never one netted number — mixing purities would make the
figure meaningless (different purities have different values per gram).

## Gold rate / value are snapshotted, never recalculated

`goldRatePerGram` and `goldValue` on `GoldLedgerEntry` are optional inputs
captured *at the moment of the transaction* — they exist for
record-keeping (so a historical "gold given" entry shows what it was worth
that day) and are **never** looked up again from today's rate. Reading an
old entry's value always returns exactly what was recorded, even if the
gold rate has moved since.

## `getPartyGoldPosition()`

Returns one row per non-zero-balance purity for a party:
`{ purity, balance, status: "HOLDS_GOLD" | "OWES_GOLD" | "SETTLED" }`. Zero
balances are filtered out — a fully settled purity simply doesn't appear,
rather than showing a "0.000g, SETTLED" row for every purity that was ever
touched.

## `recordGoldAdjustment()`

The explicit, separate function for manual corrections — write-offs,
approved wastage settlement, data-entry fixes. Always requires the caller
to state `direction: "debit" | "credit"` (there is no default), always
requires a `description`, and writes a `GOLD_ADJUSTED` audit log entry.
**Never** called implicitly by any other function — see `KARIGAR-SYSTEM.md`
"Wastage reconciliation" for why `classifyGoldJobDifference()` (an
annotation) and `recordGoldAdjustment()` (an actual balance change) are
kept as two separate, deliberate steps.

## `transferGoldBetweenParties()`

Moves gold directly from one party to another (e.g. a karigar hands
unused raw gold to a different karigar) without passing back through the
business — two linked `GoldLedgerEntry` rows (a credit on the source, a
debit on the destination) in one transaction, both referencing each other
via `referenceType`/`referenceId`.

## System Gold (for reconciliation)

`getSystemGoldWeightForPurity()` computes `SUM(ABS(balance))` across every
`PartyGoldBalance` row for a purity — i.e. gold currently tracked as "out
with a karigar" or "owed to a supplier." This is a deliberate scope
decision: Phase 5 does not model a separate raw/loose shop-gold inventory
that hasn't yet been allocated to any party. See `RECONCILIATION.md`.

## Company-wide and per-party views

`listAllGoldLedgerEntries()` (filterable by party type/purity/transaction
type/date range, with party names resolved) powers the company-wide Gold
Transactions page; `listGoldLedgerEntriesForParty()` powers a single
Karigar/Supplier profile's Gold Ledger tab; `listGoldWithKarigars()` /
`listGoldWithSuppliers()` power the summary tables on `/gold-ledger/karigars`,
`/gold-ledger/suppliers`, and the Karigars/Suppliers module's own "Gold
With..." pages.
