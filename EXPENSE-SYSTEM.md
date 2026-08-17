# Expense & Income System (Phase 6)

## Expense categories

`ExpenseCategory` is configurable data, never a hardcoded enum or
string-matched business rule — `expense-category.service.ts` (`listActiveExpenseCategories()`,
`listAllExpenseCategories()`, `createExpenseCategory()`,
`setExpenseCategoryActive()`). 19 starter categories are seeded
(`isSystem: true`): Rent, Electricity, Gas, Water, Internet, Telephone,
Salaries, Shop Maintenance, Security, Transportation, Packaging,
Marketing, Advertising, Office Supplies, Software, Bank Charges, Repair,
Cleaning, Miscellaneous. OWNER/ADMIN can add more from Accounting →
Expenses → Manage Categories; a category is never hard-deleted, only
toggled `isActive = false` (`setExpenseCategoryActive()`), so a category
with existing expense history stays intact and simply drops out of the
"add expense" picker.

## Numbering

`Expense.sequence` / `Income.sequence` are Postgres-native
`@default(autoincrement())` integers — the same race-free identity pattern
as `Barcode.sequence`, `Invoice.sequence`, `Purchase.sequence`, etc. The
human-readable code (`ZJ-EXP-000001` / `ZJ-INC-000001`) is *derived* from
the sequence at read time (`src/lib/expense-number.ts` /
`src/lib/income-number.ts`), never stored redundantly, and is unique and
never reused — even a voided expense keeps its original number forever.

## Expense creation & payment

`createExpense(input, userId)` (`expense.service.ts`):

1. Validates `amount > 0` (`InvalidExpenseAmountError`) and rejects a
   payment method Expense can't represent as an actual cash-out — see
   "Payment methods" below (`InvalidExpensePaymentMethodError`).
2. Confirms the category is active (`ExpenseCategoryInactiveError`).
3. In one `$transaction`: creates the `Expense` row (status `ACTIVE`), then
   writes a `CashTransaction` (`transactionType: "EXPENSE"`, `direction:
   "OUT"`, `referenceType: "Expense"`, `referenceId`) — an expense payment
   is **atomic**: the expense record and the cash-book impact either both
   happen or neither does.
4. Writes an `EXPENSE_CREATED` audit log entry.

Income (`createIncome()`, `income.service.ts`) mirrors this exactly:
`incomeType` (`OTHER_INCOME`/`SERVICE_INCOME`/`MISC_INCOME`) instead of a
category, and a `CashTransaction` with `transactionType: "INCOME_RECEIVED"`,
`direction: "IN"`. Income never duplicates a POS sale — `Sale` and `Income`
are structurally separate tables with zero overlap in what they represent;
a sale always posts through `sale-transaction.service.ts`, never through
`createIncome()`.

### Payment methods

Both `Expense.paymentMethod` and `Income.paymentMethod` reuse the shared
`PaymentMethod` enum, restricted to `CASH`/`CARD`/`BANK_TRANSFER`/`OTHER` —
`CREDIT` is rejected at the service layer (`InvalidExpensePaymentMethodError`/
`InvalidIncomePaymentMethodError`), the same reasoning `PurchasePayment`
already applies: nothing was actually received/paid yet, so it can't be a
recorded cash-book fact.

## The void/reversal correction pattern

The spec is explicit: **never silently modify a historical financial
transaction.** `voidExpense({ expenseId, reason }, userId)` /
`voidIncome({ incomeId, reason }, userId)`:

1. Require a non-empty `reason` (`EmptyVoidReasonError`/
   `EmptyIncomeVoidReasonError`).
2. Reject a row that's already `VOIDED`
   (`ExpenseAlreadyVoidedError`/`IncomeAlreadyVoidedError`).
3. In one `$transaction`: set `status = VOIDED`, `voidReason`, `voidedById`,
   `voidedAt` — **the original `amount`, `description`, `expenseDate`/
   `incomeDate`, and category/type are never touched.**
4. In the same transaction, write a **compensating** `CashTransaction`
   (`transactionType: "CASH_ADJUSTMENT"`, opposite `direction` from the
   original, same `amount`, `referenceType`/`referenceId` pointing back at
   the voided row) — so the physical cash book is never left wrong by a
   void.
5. Write an `EXPENSE_VOIDED`/`INCOME_VOIDED` audit log entry.

A correction is then a **separate, later** `createExpense()`/`createIncome()`
call with `reversalOfId` set to the voided row's id. The read side exposes
this both directions (`Expense.reversalOf` / `Expense.reversedBy`), so a
correction chain is always fully traceable:

```
Expense #ZJ-EXP-000042  CREATED  (amount wrong)
    -> VOIDED (reason, voidedBy, voidedAt) + compensating CashTransaction
Expense #ZJ-EXP-000058  CREATED  (correct amount, reversalOfId = #42's id)
```

Nothing is ever `DELETE`d and nothing is ever `UPDATE`d on `amount`/
`description`/date/category after creation. See `ARCHITECTURE.md` "The
void/reversal correction pattern" for the underlying design rationale.

## Worked example

Voiding a mistaken Rs. 30,000 cash expense and recording the correct
Rs. 25,000 one:

1. `createExpense({ categoryId: rent, amount: 30000, paymentMethod: "CASH", ... })`
   → `Expense #ZJ-EXP-000010` (`ACTIVE`), `CashTransaction` (`EXPENSE`,
   `OUT`, 30,000).
2. `voidExpense({ expenseId: "...#10", reason: "Entered wrong amount" })`
   → `Expense #10` becomes `VOIDED`; a `CashTransaction`
   (`CASH_ADJUSTMENT`, `IN`, 30,000) reverses the cash-out.
3. `createExpense({ ..., amount: 25000, reversalOfId: "...#10" })`
   → `Expense #ZJ-EXP-000011` (`ACTIVE`, `reversalOfId = #10`),
   `CashTransaction` (`EXPENSE`, `OUT`, 25,000).

Net cash-book effect: -30,000 + 30,000 - 25,000 = **-25,000** — exactly the
correct amount, with a complete, honest paper trail of the mistake and its
correction.

## Read side

`listExpenses(filters)` / `listIncomes(filters)` support date range,
category/type, status, and payment-method filters plus pagination —
powering the Accounting → Expenses / Income pages and their CSV export
(`FINANCIAL-REPORTS.md` "Export architecture"). `getExpenseById()` /
`getIncomeById()` return a single row including its `reversalOf`/
`reversedBy` chain for the detail view.

## Permissions

`accounting:expenses:view` — list/read. `accounting:expenses:create` —
`createExpense()`. `accounting:expenses:manage` — void an expense, manage
categories. `accounting:income:manage` — create/void income (no separate
view-only key; income is lower-volume than expenses and the spec doesn't
split it further). `OWNER` bypasses all; only `OWNER`/`ADMIN` are seeded
today — see `ACCOUNTING.md` "Permissions".
