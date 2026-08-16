# Point of Sale (Phase 3)

## Navigation

POS is promoted from "coming in next phase" to a real module with 4
sub-nav tabs, all under `(app)/pos/`:

| Tab            | Route                    | Purpose                                  |
| -------------- | ------------------------- | ------------------------------------------ |
| New Sale       | `/pos`                    | The checkout screen (`<PosScreen>`)        |
| Sales History  | `/pos/sales`               | Search/filter/sort/paginate past sales     |
| Returns        | `/pos/returns`             | Request and approve returns                |
| Invoices       | `/pos/invoices`            | Every generated invoice document, with print/download counts |

`pos/layout.tsx` requires `sales:view` once for the whole group, the same
pattern `inventory/layout.tsx` established in Phase 2. `sales/[id]/page.tsx`
(sale detail) and `sales/[id]/invoice/page.tsx` (print layout) live under
`sales/` rather than their own top-level route.

## The New Sale screen

`<PosScreen>` (`src/components/pos/pos-screen.tsx`) is a Client Component —
it has to be, to respond to keystrokes from a USB barcode scanner and debounce
live server previews — composed from four smaller pieces:

- **Scan/search bar** — one input serves both barcode scanning and product
  search (see below).
- **`<CartPanel>`** — the cart, one row per item: product name, barcode,
  purity/weight, a per-line discount type + value, and the live
  server-computed final price.
- **`<CustomerPicker>`** — search an existing customer by name/phone, or
  add a minimal new one, or leave it empty for a walk-in sale.
- **`<PaymentPanel>`** — one or more payment lines (method + amount +
  optional reference), with a live "Paid / On credit" balance readout.

Every number the cashier sees — per-item discount, subtotal, tax, grand
total, payment balance — comes from a Server Action, never from math run in
the browser. See ARCHITECTURE.md "Why a Server Action recomputes..." and
`SALES.md` "Live pricing preview" for exactly why.

## Barcode scanning

A USB barcode scanner behaves as a keyboard: it "types" the barcode's
characters into whatever input is focused, then sends `Enter`. The scan bar
is `autoFocus`ed on page load specifically so a scan works the instant a
cashier opens New Sale, with no click required.

On `Enter`:

1. Try `lookupBarcodeForSaleAction(value)` — an exact-barcode lookup. If it
   finds an `IN_STOCK`, non-archived item, add it to the cart immediately.
2. Otherwise, if the live search-as-you-type results (below) currently show
   at least one match, add the first result.
3. Otherwise, show "No matching item found for \"...\"" — never silently
   do nothing.

Scanning a barcode for an item that is `SOLD`, `DAMAGED`, `LOST`, or
archived is rejected with a specific reason (`"... is not available for
sale (status: SOLD)."`), not a generic error. Scanning the same item twice
in one cart is rejected with `"... is already in the cart."` — see
`addToCart()` in `pos-screen.tsx`.

## Product search

The same input, while the user is typing (not yet pressing Enter), debounces
(~200ms) into `searchProductsForSaleAction(query)`, which searches product
name, design number, supplier, karigar, and barcode — reusing
`listInventoryItems()` from Phase 2 with a hard `status: "IN_STOCK"` filter,
so a sold or reserved item can never appear as a search result to begin
with. Results render as a clickable list; clicking one adds it to the cart
via the same `addToCart()` path a scan uses.

## Live pricing preview

`previewCartAction` and `previewPaymentBalanceAction`
(`src/lib/actions/sales.actions.ts`, backed by
`src/services/sale-preview.service.ts`) recompute the cart's
discount/subtotal/tax/grand-total and the payment balance on every change,
~200ms debounced. Unlike the authoritative checkout path, an invalid line
(exceeds the role's discount limit, references an item that's no longer
available) is reported *inline* — `exceedsDiscountLimit`, `available: false`
— rather than thrown, because a cart mid-edit is a completely normal state,
not an error. `completeSaleAction` re-validates everything with the
throwing versions of the same functions before it ever writes to the
database — the preview is advisory, never trusted.

## Keyboard shortcuts

| Shortcut | Effect |
| -------- | ------ |
| `F2` or `Ctrl+K` | Focus the scan/search bar |
| `Enter` (in the scan/search bar) | Scan-or-add, per "Barcode scanning" above |
| `Escape` (in the scan/search bar) | Clear the current search text |
| `Delete` / `Backspace` (a focused cart row) | Remove that item from the cart |
| `Ctrl+Enter` | Complete Sale, if the sale is currently valid |

None of these hijack a shortcut a browser or OS already claims globally —
`Ctrl+K`/`F2` are scoped to `preventDefault` only inside the POS screen's own
keydown listener, and `Delete`/`Backspace` only fire when a cart row itself
(not a text input inside it) has focus.

## Completing a sale & double-submit protection

The Complete Sale button is disabled unless the cart is non-empty, every
line's live preview is valid, and the payment preview reports the payments
are exactly balanced (`paymentPreview.isBalanced`). On click, a
synchronous `useRef` guard (`submittingRef`) prevents a second click from
firing a second `completeSaleAction` call while the first is still
in-flight — but the real, unconditional guarantee is server-side: see
`SALES.md` "Concurrency" for why the database transaction itself makes a
true duplicate sale impossible even if the client-side guard were somehow
bypassed.

On success, a confirmation dialog shows the invoice number and grand total,
with "New sale" (clears the cart) and "View invoice" (navigates to the sale
detail page) actions.

## Permissions

| Permission     | Gates                                          |
| -------------- | ------------------------------------------------ |
| `sales:view`   | The whole `(app)/pos` route group; the PDF Route Handler |
| `sales:create` | Every POS lookup/preview/checkout Server Action   |
| `sales:return` | Approving a return (`approveReturn`) — requesting one only needs `sales:view` |

`OWNER` bypasses all three, identically to every other module.
