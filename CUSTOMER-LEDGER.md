# Customer Financial Ledger (Phase 4)

## The primitive — one write path, everywhere

`appendCustomerLedgerEntry(tx, input)` (`src/services/customer-ledger.service.ts`)
is the **only** function in the codebase allowed to change
`Customer.outstandingBalance`. Every ledger-affecting event — a credit
sale, a standalone customer payment, a future refund or manual adjustment —
goes through it, inside the same database transaction as the event that
caused it:

```ts
export async function appendCustomerLedgerEntry(
  tx: Prisma.TransactionClient,
  input: LedgerEntryInput, // { customerId, transactionType, referenceType, referenceId, debit?, credit?, description?, createdById }
): Promise<{ id: string; balanceAfter: Prisma.Decimal }>
```

Internally it does exactly two things, always in this order:

1. **`adjustCustomerOutstandingBalanceInTx(tx, customerId, delta)`** — one
   atomic raw SQL statement:
   ```sql
   UPDATE customers
   SET "outstandingBalance" = "outstandingBalance" + $delta
   WHERE id = $customerId
   RETURNING "outstandingBalance"
   ```
   where `delta = debit - credit`. Because this is a single `UPDATE ...
   RETURNING`, Postgres takes the row lock itself — two simultaneous
   ledger writes for the same customer are automatically serialized by the
   database. No `SELECT ... FOR UPDATE`, no application-level locking, no
   race window between "read the balance" and "write the new balance"
   exists, because there is no separate read step.
2. **Create the `CustomerLedgerEntry` row**, using the *exact* value the
   `UPDATE ... RETURNING` handed back as `balanceAfter` — never a value
   recomputed separately, so the entry and the cached column can never
   disagree about what the balance was at that moment.

Every entry records exactly one non-zero side: a `debit` raises what the
customer owes, a `credit` lowers it. `referenceType`/`referenceId` are a
polymorphic pointer to whatever caused the entry (`"Sale"`,
`"CustomerPayment"`, ...) — the same string-reference pattern `AuditLog`
already uses.

## Worked example — the spec's own numbers

Customer starts at `outstandingBalance = 0`.

**Sale of 500,000, paid 400,000 cash, 100,000 on credit:**

| Step | Entry | debit | credit | balanceAfter |
| ---- | ----- | ----- | ------ | ------------- |
| 1 | `SALE` (referenceType: `Sale`) | 500,000 | — | 500,000 |
| 2 | `PAYMENT` (referenceType: `Sale`) | — | 400,000 | 100,000 |

Outstanding balance: **100,000** — matches the spec's worked example
exactly. `sale-transaction.service.ts`'s `completeSale()` posts both
entries inside the sale's own transaction: a `SALE` debit for the full
`grandTotal` (never just the credit portion), then — only if
`paymentSummary.paidAmount > 0` — a `PAYMENT` credit for whatever was paid
non-credit at checkout.

**Then the customer pays off the remaining 100,000** via "Receive Customer
Payment":

| Step | Entry | debit | credit | balanceAfter |
| ---- | ----- | ----- | ------ | ------------- |
| 3 | `PAYMENT` (referenceType: `CustomerPayment`) | — | 100,000 | 0 |

Outstanding balance: **0**.

**A fully-paid sale** (500,000 sale, 500,000 cash, nothing on credit) still
posts *both* entries — a 500,000 debit and a 500,000 credit — netting to a
balance change of 0, but leaving a complete, auditable ledger history: you
can always see that a full-price sale happened and was paid in full,
instead of a sale that silently left no trace because nothing was
"owed." This is why `SALE` debit always equals the *full* grand total,
never the grand total minus whatever was paid at checkout — the debit
represents what was sold, the credit represents what was paid; the two are
independent facts.

## Payment transaction — "Receive Customer Payment"

`recordCustomerPayment(input, userId)` (`customer-payment.service.ts`), one
`prisma.$transaction`:

1. Validate `amount > 0` (`InvalidPaymentAmountError` otherwise).
2. Validate `method !== "CREDIT"` (`CreditNotAValidPaymentMethodError`) —
   you cannot "receive a credit payment"; only `CASH`, `CARD`,
   `BANK_TRANSFER`, `OTHER` are accepted (enforced at the service layer,
   not the schema, to avoid a near-duplicate `PaymentMethod` enum).
3. Load the customer's current `outstandingBalance`
   (`CustomerNotFoundForPaymentError` if missing).
4. Unless `customer.overpayment_allowed` (a `SystemSetting`, default
   `"false"`) is `"true"`, reject a payment greater than the outstanding
   balance (`OverpaymentNotAllowedError`).
5. **In one transaction**: create the `CustomerPayment` row, then call
   `appendCustomerLedgerEntry()` (`transactionType: "PAYMENT"`,
   `referenceType: "CustomerPayment"`, `credit: amount`). Any failure at
   either step rolls back both — there is never a `CustomerPayment` row
   with no corresponding ledger entry, or vice versa.
6. After the transaction commits, write a `CUSTOMER_PAYMENT_RECEIVED`
   audit log entry (customer id, amount, method, resulting balance).

Returns `{ id, balanceAfter }` so the UI can show "New balance: Rs.
X" immediately without a second round-trip.

## Balance calculation

`Customer.outstandingBalance` is a **cache**, not the source of truth — the
source of truth is "the sum of every `CustomerLedgerEntry.debit` minus every
`CustomerLedgerEntry.credit` for this customer." The cache exists purely
for read performance (POS needs to check it on every credit sale without
summing a whole ledger table), and is guaranteed correct because the only
function allowed to write it is the same function that writes the ledger
row justifying the change, in the same transaction.

## Reconciliation

`reconcileCustomerBalance(customerId)` independently sums every ledger
entry's `debit - credit` for a customer and compares that sum to the
cached `Customer.outstandingBalance`. If they disagree, it throws
`LedgerReconciliationError` carrying both values — **it never silently
"fixes" the cached column**. A mismatch is a real integrity bug (a code
path wrote to `outstandingBalance` without going through
`appendCustomerLedgerEntry`, or a migration touched the column directly)
and should be investigated, not papered over. `reconcileAllCustomerBalances()`
runs this check across every customer, for an operational/admin health
check. `tests/customer-ledger.integration.test.ts` proves both the
matching case and a deliberately-induced mismatch (a raw update bypassing
the ledger) are each reported correctly.

## Concurrency

Because the balance update is one atomic `UPDATE ... RETURNING`
(`adjustCustomerOutstandingBalanceInTx`), firing several
`appendCustomerLedgerEntry()` calls for the *same* customer at the same
time is safe without any explicit locking — Postgres's row-level lock
serializes them. `tests/customer-ledger.integration.test.ts` fires 5
simultaneous entries for one customer and asserts the final balance is
exactly the sum of all 5 deltas, with 5 correctly-chained `balanceAfter`
values (no lost update).

## The Customer Ledger page (company-wide)

`listAllLedgerEntries()` shows every ledger entry across every customer —
search by customer name/phone, filter by `transactionType` and date range,
paginated. Per-customer, the profile page's **Ledger** tab
(`listLedgerEntriesForCustomer()`) shows just that customer's history.

## Returns integration (deferred)

`LedgerTransactionType` already includes `REFUND` and `CREDIT_ADJUSTMENT`
specifically so a future phase can post ledger entries when a return is
approved, without any schema change. Phase 4 does **not** wire this up —
approving a return (Phase 3's `approveReturn()`) still only moves inventory
and updates the `Sale`/`Return` status; it does not touch the customer
ledger yet. This is a deliberate scope boundary from the spec ("do not
implement a complicated exchange engine now"), not an oversight — see
README "Known limitations".

## Corrections

The ledger is append-only — there is no update or delete path on
`CustomerLedgerEntry` anywhere in the codebase. A correction is a new row
with `transactionType: CREDIT_ADJUSTMENT` or `DEBIT_ADJUSTMENT` (posting a
`CUSTOMER_LEDGER_ADJUSTED` audit entry), never an edit to history.
