# Supplier Management (Phase 5)

## What a Supplier is

A raw-material or finished-goods vendor the business buys from — on
consignment (gold) or against a purchase invoice (goods/cash). `Supplier`
(`src/services/supplier.service.ts`) mirrors `Karigar`'s shape exactly: a
`ZJS-NNNNNN` code, a unique `phone`, a `status` that is changed, never
deleted.

| Field           | Notes                                                     |
| ---------------- | ----------------------------------------------------------- |
| `codeSequence`   | `ZJS-000001`, derived from a Postgres autoincrement column at read time (`src/lib/supplier-code.ts`) |
| `contactPerson`  | optional, distinct from the supplier's own `name`             |
| `status`         | `ACTIVE`, `INACTIVE`, `BLOCKED` — `BLOCKED` prevents a new `Purchase` from `purchase.service.ts` |

A Supplier is **never hard-deleted**. `changeSupplierStatus()` is the only
status-change path and always writes a `SUPPLIER_STATUS_CHANGED` audit log
entry.

## Purchase summary vs. live payable — the same split as Sale/Customer

`getSupplierPurchaseSummary()` returns a **snapshot** rollup —
`totalPurchases`, `purchaseCount`, `amountPaid`, `lastPurchaseAt` — computed
live from `Purchase` rows. It deliberately does **not** include an
"amountPayable" field. The true, ongoing payable balance always comes from
`party-cash-ledger.service.ts`'s `getPartyCashPosition()` instead — exactly
the same split Phase 3/4 already has between `Sale.balanceAmount` (a
frozen snapshot of one sale) and `Customer.outstandingBalance` (the live,
ledger-derived figure). Never read the purchase summary to answer "how
much do we currently owe this supplier" — always read the cash position.

## Supplier gold — consignment

A supplier can also be a gold source: receiving raw gold from a supplier
on consignment posts a `GOLD_RECEIVED` credit to the *same*
`gold-ledger.service.ts` primitive karigars use, via the polymorphic
`(partyType: "SUPPLIER", partyId)` pair. Because the ledger's sign
convention is party-type-agnostic, this correctly produces `OWES_GOLD` —
the business now owes the supplier gold back — with zero
`if (partyType === "SUPPLIER")` branching anywhere in the ledger code. See
`GOLD-LEDGER.md`.

## Supplier payments — `supplier-payment.service.ts`

`recordSupplierPayment()` composes `appendPartyCashLedgerEntry()`
(`PAYMENT`, credit — reduces what's owed) with `recordCashTransactionInTx()`
(`SUPPLIER_PAYMENT`, `OUT`) in one transaction, rejecting a zero/negative
amount (`InvalidSupplierPaymentAmountError`), and writes a
`SUPPLIER_PAYMENT_RECORDED` audit log entry. `listPurchasePaymentsForSupplier()`
reads `PurchasePayment` rows filtered by `purchase.supplierId`, for the
Supplier profile's Payments tab.

## Supplier Profile

`[id]/page.tsx` renders six tabs — Overview, Purchases, Ledger, Gold,
Payments, Notes — pre-rendered server-side, same pattern as Karigar/
Customer profiles.

## Navigation

All Suppliers, Add Supplier, Supplier Ledger (company-wide cash ledger) —
`SUPPLIERS_SUB_NAV` in `src/config/nav.ts`.

## Permissions

| Key                 | Grants                                          |
| --------------------- | -------------------------------------------------- |
| `suppliers:view`     | read supplier list/profile/ledgers/purchases       |
| `suppliers:manage`   | create/edit/status-change a supplier                |

Purchase creation itself is gated separately by `purchases:create` (see
`PURCHASE-SYSTEM.md`), since a CASHIER or SALESPERSON might reasonably view
a supplier's ledger without being able to record a new purchase. `OWNER`
bypasses all checks; `ADMIN` is seeded with every Phase 5 permission.

## Search & filtering

`searchSuppliers()` (typeahead) and `listSuppliers()` (paginated,
filterable by `status`, sortable) — the same shape as `karigar.service.ts`.
