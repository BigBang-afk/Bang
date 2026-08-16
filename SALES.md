# Sales, Payments & Returns (Phase 3)

## Why `Sale`/`SaleItem`/`Payment`/`Invoice` are four tables, not one

The spec lists `invoiceNumber` as a field of a sale but also asks for a
separate `Invoice` entity. This is resolved deliberately, not by accident:
`Invoice` tracks the printable **document** lifecycle (`sequence`,
`printCount`, `downloadCount`, ...) exactly the way `Barcode` tracks the
physical-label lifecycle for an `InventoryItem` in Phase 2. `Sale` has no
redundant `invoiceNumber` string column — it's derived from the 1:1
`sale.invoice.sequence` relation via `formatInvoiceNumber()`
(`src/lib/invoice-number.ts`), the same "one source of truth, format
derived at read time" pattern Phase 2 established for barcodes.

`Sale.discount` is the sum of every `SaleItem.discountAmount` — there is no
separate sale-level discount field, because the spec's cart UI discounts
per line item, and a sale-level discount would just be redundant/
conflicting state to keep in sync.

## Sale transaction — the 14-step flow

`completeSale()` (`src/services/sale-transaction.service.ts`) is the single
highest-stakes write path in the app. It does not trust anything from the
client except *which* items, *what* discount was requested, and *what*
payments were entered — every price, weight, and rate comes from the
database.

1. Validate the cart is non-empty and contains no duplicate item.
2. Validate the customer exists, if one was selected.
3. In parallel: fetch the acting user's max discount % (role-based, see
   below), the tax settings, and every selected `InventoryItem` (with its
   `Product` and `Barcode`).
4. For each cart line: verify the item is not archived and is `IN_STOCK`;
   recalculate its discount via `calculateItemDiscount()`; assert it's
   within the role's limit.
5. Recalculate sale totals via `calculateSaleTotals()` (tax only applied if
   enabled).
6. Validate the submitted payments sum exactly to the grand total via
   `validatePaymentsMatchGrandTotal()`.
7. Reject the sale if it would extend credit (`balanceAmount > 0`) with no
   customer selected — walk-in sales must be paid in full.
8. Open one `prisma.$transaction`:
9. Create the `Sale` row.
10. For each item: an **atomic, conditional** `updateMany({ where: { id,
    status: "IN_STOCK", archivedAt: null }, data: { status: "SOLD" } })` —
    this is the concurrency guarantee, see below — then create its
    `SaleItem` snapshot and record a `STOCK_SOLD` `StockMovement`.
11. Create each `Payment` row.
12. If the sale carries a balance, increment `Customer.outstandingBalance`.
13. Create the `Invoice` row (its `sequence` auto-increments, race-free).
14. Commit. After the transaction commits (never inside it, so a rollback
    can't leave a log entry for something that didn't happen), write audit
    log entries: `SALE_COMPLETED`, `DISCOUNT_APPLIED` (if any), one
    `PAYMENT_CREATED` per payment line, `INVOICE_GENERATED`.

If any step from 8–13 fails, the whole transaction rolls back — there is no
code path that creates a `Sale` without its inventory being updated, or
updates inventory without a `Sale` to account for it.

## Concurrency — two cashiers, one item

Step 10's `updateMany` is the entire defense, and it's sufficient on its
own: Postgres takes a row-level lock during an `UPDATE`, so if two
transactions race to flip the same `InventoryItem` from `IN_STOCK` to
`SOLD`, the database itself serializes them. Whichever transaction commits
first wins; the second's `updateMany` reports `count: 0` (the row no longer
matches `status: "IN_STOCK"`), which throws `InventoryUnavailableError` and
rolls back that entire sale — no explicit `SELECT ... FOR UPDATE`, no
SERIALIZABLE isolation level, and no application-level locking needed. This
is the same pattern Phase 2's `changeInventoryItemStatus()` and barcode
sequence generation both already rely on.

`tests/sale-transaction.service.integration.test.ts` proves this under
real concurrency: firing 5 simultaneous `completeSale()` calls for the same
item results in exactly 1 success and 4 `InventoryUnavailableError`
rejections, with exactly one `STOCK_SOLD` movement recorded.

## Cart item — what a `SaleItem` snapshots

Inventory Item ID, Barcode, Product Name, Purity, Net Weight, Wastage
(type/percent/weight), Gross Weight, Gold Rate (the exact rate used, not
looked up again), Gold Value, Making/Stone/Diamond/Other Charges, Original
Selling Price, Discount (type/value/amount), Final Price. **Never**
reconstructed from the live `InventoryItem`/`Product` row — if that product
is edited, archived, or its category renamed next month, this sale's
invoice is completely unaffected. Proven in
`tests/sale-transaction.service.integration.test.ts`: creating a sale, then
inserting a much higher `GoldRate` for the same purity, leaves the
already-created `SaleItem.goldRatePerGram` and the sale's `grandTotal`
untouched.

## Discount calculation & permission

`calculateItemDiscount()` (`src/services/sale-pricing.service.ts`), pure
`decimal.js`:

```
PERCENTAGE: discountAmount = originalSellingPrice × discountValue / 100
FIXED:      discountAmount = discountValue
finalPrice = originalSellingPrice - discountAmount
```

Worked example from the spec: selling price 500,000, a fixed discount of
20,000 → final price 480,000.

The maximum discount % a role may apply is `SystemSetting`-backed
(`discount.max_percent.<ROLE_NAME>`, see ARCHITECTURE.md "Settings as
data"), read by `getMaxDiscountPercentForRole()` and enforced by
`assertDiscountWithinLimit()` — server-side, inside `completeSale()`,
never only in the UI. `OWNER` is never capped. A role with no configured
limit gets **0%**, not unlimited — a missing setting must never silently
grant more discount than an owner intended. Seeded defaults (from
`prisma/seed.ts`): `OWNER` 100, `ADMIN` 50, `CASHIER` 10, `SALESPERSON` 10
— all editable later from Settings once a role-management UI exists.

## Payment architecture

`PaymentMethod`: `CASH`, `CARD`, `BANK_TRANSFER`, `OTHER`, `CREDIT`. No
payment-gateway integration — a `Payment` row records a fact the cashier
entered, it does not charge a card or move real money.

`validatePaymentsMatchGrandTotal()` sums every non-`CREDIT` payment into
`paidAmount` and every `CREDIT` line into `balanceAmount`, then requires
`paidAmount + balanceAmount` to equal the grand total **exactly** — Phase 3
does not support overpayment or change due, per the spec's explicit
default. Worked example from the spec: grand total 500,000, paid as Cash
200,000 + Bank Transfer 200,000 + Credit 100,000 → `paidAmount` 400,000,
`balanceAmount` 100,000, total payments 500,000 (balanced, accepted).
Underpayment (payments summing to less than the grand total, with no
`CREDIT` line covering the rest) and overpayment are both rejected with a
specific error message.

## Customer

A minimal picker, not a CRM: search by name/phone/ID (`searchCustomers()`),
showing name, phone, previous purchase count, and outstanding balance.
Leaving it empty is a first-class "walk-in" sale — Phase 3 never creates a
placeholder `Customer` row just to represent a walk-in. Adding a new
customer takes only name + phone (unique) + optional email/notes.

## Customer credit

If a sale carries a `CREDIT` payment line, `Customer.outstandingBalance` is
incremented (never decremented — there is no "customer pays down their
balance" flow yet) inside the same transaction as the sale. This is
deliberately just the transactional foundation, not a ledger: no aging, no
payment-against-balance UI, no statements. A future phase builds the full
customer ledger on top of this column without needing a schema change to
`Sale`/`Payment`.

## Tax

`tax.enabled` (default `"false"`) and `tax.percent` (default `"0"`) are
`SystemSetting` rows — never hardcoded, never assumed. A sale created while
tax is disabled has `tax = 0` and no tax line anywhere on its invoice.

## Returns foundation

Deliberately two steps, not one, so that "someone clicked return" can never
by itself put an item back into sellable stock:

1. **`requestReturn(saleItemId, reason, userId)`** — creates a `Return` row
   (`status: RETURN_REQUESTED`). No inventory side effect at all. Rejected
   if the sale item isn't currently `SOLD`, or if a `Return` already exists
   for it (`ReturnAlreadyExistsError` — at most one return per sale item).
2. **`approveReturn(returnId, userId)`** — the *only* path that moves
   inventory. In one transaction: `InventoryItem` transitions `SOLD` →
   `RETURNED` (reusing the exact same atomic conditional-update +
   `StockMovement` primitive, `transitionInventoryStatusInTx()`, that
   Phase 2's `changeInventoryItemStatus()` uses — extracted specifically so
   both callers share one atomicity guarantee instead of duplicating it);
   the `Return` row moves to `RETURNED`; the parent `Sale.status` becomes
   `RETURNED` (every item on it has been returned) or `PARTIALLY_RETURNED`
   (some have). Gated by the `sales:return` permission — a different,
   stronger grant than the `sales:view` needed just to request a return.

No exchange workflow, no automatic restocking-without-review, no refund/
payment-reversal logic — those are explicitly future scope.

## Audit log actions

`SALE_COMPLETED`, `DISCOUNT_APPLIED` (only when total discount > 0),
`PAYMENT_CREATED` (one per payment line), `INVOICE_GENERATED`,
`INVOICE_PRINTED`, `INVOICE_DOWNLOADED`, `RETURN_REQUESTED`,
`RETURN_APPROVED`, `CUSTOMER_CREATED`. Always written after the relevant
transaction commits, never inside it — the established Phase 1/2 pattern,
so a rolled-back transaction never leaves behind a log entry describing
something that didn't actually happen.

## Sales History & Sale Detail

`listSales()` (`src/services/sale.service.ts`) supports search (invoice
number, customer name/phone, barcode — reusing `parseInvoiceNumber()` and
`parseBarcodeCode()` to detect which kind of token was typed), filters
(date range, payment status, sale status), 4 sort orders, and server-side
pagination — the same shape as Phase 2's `listInventoryItems()`. Sale
Detail shows every item's full snapshot, every payment, the customer, and
Print/PDF/Return actions (see `INVOICE-SYSTEM.md`).
