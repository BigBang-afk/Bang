# Purchase Management (Phase 5)

## Overview

`createPurchase(input, userId)` (`src/services/purchase.service.ts`) is a
supplier purchase transaction engine, deliberately shaped like Phase 3's
`completeSale()`: validate everything up front, then commit atomically.

```ts
{
  supplierId,
  items: [{ description, purity, netWeight, wastageWeight, wastageType, wastagePercent?, goldRatePerGram, charges?, categoryId?, addToInventory, sellingPrice? }],
  charges,
  payments: [{ method, amount, reference? }],
}
```

## Validation happens before any transaction opens

1. Supplier exists and is not `BLOCKED` (`SupplierNotFoundForPurchaseError`).
2. At least one item (`EmptyPurchaseError`).
3. Every item's weight/gold value is computed via the **reused** Phase 1
   `calculateGoldValue()` engine — never re-implemented — using each
   item's own `goldRatePerGram` (a purchase snapshot, independent of
   today's official rate).
4. If `addToInventory: true` for an item, `sellingPrice` is required
   (`MissingSellingPriceError`) — a piece can't enter stock with no price.
5. Totals are summed (`subtotal` = sum of item gold values, `+ charges =
   grandTotal`), and every payment is validated: no `CREDIT` method, and
   `sum(payments) <= grandTotal` (`PurchaseOverpaymentError`) — no
   overpayment, mirroring the customer-payment policy default.

Because **all** of this happens before `prisma.$transaction` is opened, a
failure anywhere in a multi-item purchase — even on the last item — leaves
**zero** rows written for **any** item. This is verified directly:
`tests/purchase.service.integration.test.ts`'s rollback test constructs a
purchase where one of several items has no `sellingPrice`, and asserts no
`Purchase` row exists afterward at all.

## The transaction

One `prisma.$transaction`:

1. `Purchase` + `PurchaseItem` rows (purchase number `ZJ-PUR-000001`,
   derived from `Purchase.sequence` at read time — `src/lib/purchase-number.ts`,
   same pattern as `Invoice`/`Barcode`).
2. For each item with `addToInventory: true` — `createInventoryItemInTx(tx,
   ..., userId)`, composed from `inventory-item.service.ts` (see
   `ARCHITECTURE.md` "Composable transactional primitives"), pushing a real
   `InventoryItem` (`source: "PURCHASED"`, `supplierId`, `purchaseItemId`
   set) with its own `Product`/`Barcode`/`StockMovement` rows — the exact
   same inventory-creation logic Phase 2 built for manufactured stock.
3. `PurchasePayment` rows, each paired with a
   `recordCashTransactionInTx()` call (`PURCHASE_PAYMENT`, `OUT`) —
   physical cash leaving the drawer.
4. The supplier's cash ledger: a `PURCHASE` debit for the full
   `grandTotal`, then a `PAYMENT` credit for whatever was actually paid —
   even a fully-paid purchase posts both, netting to zero but leaving a
   full trail. See `CASH-MANAGEMENT.md` for the worked example.

Audit logs (`PURCHASE_CREATED`, plus a `STOCK_CREATED`/`BARCODE_GENERATED`
pair per inventory item pushed) are written **after** the transaction
commits, never inside it.

## Purchased vs. manufactured stock

`InventoryItem.source` (`MANUFACTURED` default | `PURCHASED`) plus
nullable `supplierId`/`purchaseItemId` are purely additive to Phase 2's
`InventoryItem` — every Phase 2/3 caller that never sets these fields
behaves identically to before Phase 5 existed. A purchased item that
entered inventory carries its full provenance: which supplier, which
purchase line, at what purchase cost and rate — distinct from its eventual
`sellingPrice`, exactly like a manufactured item's cost and selling price
are already tracked separately.

## Purchase without pushing to inventory

`addToInventory: false` records the purchase (and the supplier
payable/payment) with no `InventoryItem` created at all — for raw
material purchases (loose gold, stones) that aren't yet a sellable,
barcoded piece.

## Purchase read side

- `listPurchases()` — search/filter (supplier, date range, payment status)
  /paginate, using `derivePurchasePaymentStatus()`
  (`src/types/purchases.ts`) to classify each purchase as fully paid,
  partially paid, or unpaid from `paidAmount` vs. `grandTotal`.
- `getPurchaseById()` — full detail (items, payments, linked inventory
  items where pushed).
- `getPurchaseSummary()` — aggregate counts/totals for the reporting
  foundation (`/party-ledger`).

## Navigation

New Purchase lives at the route root (`/purchases`) — the same "primary
action at root" pattern POS uses for New Sale — with Purchase History at
`/purchases/history`. `PURCHASES_SUB_NAV` in `src/config/nav.ts`.

## Permissions

| Key                 | Grants                                    |
| --------------------- | --------------------------------------------- |
| `purchases:view`     | read purchase list/detail/summary             |
| `purchases:create`   | record a new purchase (`createPurchase()`)     |

`createPurchaseAction()` checks only `purchases:create` — pushing an item
to inventory is part of the same atomic purchase transaction, not a
separate inventory-write call, so it is not separately gated by
`inventory:manage`. The spec's INVENTORY_MANAGER role note is satisfied by
granting that role `purchases:create` directly, once a role-management UI
exists. `OWNER` bypasses all checks; `ADMIN` is seeded with every Phase 5
permission.
