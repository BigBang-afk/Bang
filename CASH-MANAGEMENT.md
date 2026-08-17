# Cash Management (Phase 5)

Two structurally separate books, both "cash," never conflated:

1. **The party cash ledger** (`PartyCashLedgerEntry` /
   `PartyCashBalance`) — who owes whom, karigar/supplier-scoped.
2. **The company cash book** (`CashTransaction`) — how much physical cash
   is in the drawer, company-wide, unscoped to any party.

## 1. The party cash ledger primitive

`appendPartyCashLedgerEntry(tx, input)` (`src/services/party-cash-ledger.service.ts`)
is the **only** function allowed to change a `PartyCashBalance` row — the
karigar/supplier analog of `appendCustomerLedgerEntry()` from Phase 4,
built the same way: an atomic `INSERT ... ON CONFLICT (partyType, partyId)
DO UPDATE ... RETURNING balance` upsert, then a `PartyCashLedgerEntry` row
created with the exact returned balance.

### Sign convention

| Transaction type   | Direction | Effect                              |
| --------------------- | ----------- | -------------------------------------- |
| `PURCHASE`            | debit       | raises the balance toward payable      |
| `CASH_RECEIVED`       | debit       | pays down a receivable, toward payable |
| `PAYMENT`             | credit      | lowers the balance toward receivable   |
| `CASH_PAID`           | credit      | lowers the balance toward receivable   |
| `CASH_ADJUSTMENT`     | caller-specified | either — manual correction        |

`balance > 0` → **payable** (the business owes the party).
`balance < 0` → **receivable** (the party owes the business).

**The raw signed balance is never exposed to the UI.**
`getPartyCashPosition()` is the one function that turns it into an
explicit `{ payable: string; receivable: string }` pair (always one of the
two is `"0"`), so no component can accidentally render a bare negative
number where "Receivable" was meant.

### The critical worked example (spec's own numbers)

Supplier's cash position starts at `payable: 0, receivable: 0`.

**Purchase of 500,000, paid 400,000:**

| Step | Entry | debit | credit | balance | position |
| ---- | ----- | ----- | ------ | -------- | --------- |
| 1 | `PURCHASE` | 500,000 | — | 500,000 | payable 500,000 |
| 2 | `PAYMENT` | — | 400,000 | 100,000 | payable 100,000 |

**Then a payment of 100,000** (`recordSupplierPayment()`):

| Step | Entry | debit | credit | balance | position |
| ---- | ----- | ----- | ------ | -------- | --------- |
| 3 | `PAYMENT` | — | 100,000 | 0 | payable 0 |

Matches the spec exactly. `createPurchase()` posts steps 1-2 in the same
transaction as the `Purchase` row itself — even a fully-paid purchase
posts both a `PURCHASE` debit and a `PAYMENT` credit, netting to zero but
leaving a complete trail, exactly like Phase 4's `SALE`/`PAYMENT` pattern.

### Karigar cash

`karigar-cash.service.ts`'s `recordKarigarCashTransaction()` uses the same
primitive for `CASH_PAID` (e.g. a labor charge paid to the karigar) and
`CASH_RECEIVED` (e.g. an advance repaid by the karigar) — see
`KARIGAR-SYSTEM.md`.

### Manual corrections

`recordPartyCashAdjustment()` requires an explicit `direction` and a
non-empty reason, writes a `CASH_ADJUSTED` audit log entry. Never called
implicitly.

## 2. The company cash book

`cash-transaction.service.ts` tracks physical cash-in-hand as a single,
append-only log — no cached balance column, because `getCashBalance()`
computes it live: `opening (SystemSetting "cash.opening_balance") +
SUM(amount WHERE direction = IN) - SUM(amount WHERE direction = OUT)`,
optionally scoped to one `paymentMethod`. Cheap to aggregate, so there's
nothing to keep in sync and nothing that can drift.

`recordCashTransactionInTx(tx, input)` is the composable primitive — every
module that moves physical cash calls it from inside its own transaction:

- `sale-transaction.service.ts` — `SALE_PAYMENT` / `IN` for every
  non-CREDIT payment at POS checkout.
- `customer-payment.service.ts` — `CUSTOMER_PAYMENT` / `IN`.
- `purchase.service.ts` — `PURCHASE_PAYMENT` / `OUT` per payment on a
  purchase.
- `supplier-payment.service.ts` — `SUPPLIER_PAYMENT` / `OUT`.
- `karigar-cash.service.ts` — `KARIGAR_PAYMENT` / `OUT` or
  `KARIGAR_RECEIPT` / `IN`.
- `recordExpense()` — `EXPENSE` / `OUT`, for cash going out with no other
  party ledger involved (rent, utilities, ad-hoc purchases).
- `recordCashAdjustment()` — `CASH_ADJUSTMENT` / either direction,
  requires a non-empty reason.

A single business event can (and usually does) write to **both** books in
one transaction: a purchase payment calls
`appendPartyCashLedgerEntry()` (the supplier now owes less) *and*
`recordCashTransactionInTx()` (cash physically left the drawer). See
`ARCHITECTURE.md` "The company cash book vs. the party cash ledger."

## Cash Summary

`getCashSummary()` returns opening balance, total in, total out, closing
balance, and a per-`transactionType` breakdown — the read model behind
`/party-ledger`'s Cash Summary card and `/cash-management`'s own overview.

## Navigation

Cash Transactions, Cash Payable (`listAllCashPayables()`), Cash Receivable
(`listAllCashReceivables()`), Cash Reconciliation —
`CASH_MANAGEMENT_SUB_NAV` in `src/config/nav.ts`.

## Permissions

| Key              | Grants                                            |
| ------------------ | ---------------------------------------------------- |
| `cash:view`        | read cash transactions, payable/receivable, summaries |
| `cash:manage`      | record expenses, karigar/supplier payments, adjustments |
| `cash:reconcile`   | run a cash reconciliation (see `RECONCILIATION.md`)   |

`OWNER` bypasses all checks; `ADMIN` is seeded with every Phase 5
permission. The spec's role matrix additionally names CASHIER as
permitted for ordinary cash/payment operations — the `cash:manage`
permission key is scoped precisely for that role to be granted once a
role-management UI exists.
