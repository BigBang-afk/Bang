# ZJ Barcode System

## Identifier format

```
ZJ-000001
ZJ-000002
ZJ-000003
```

`ZJ-` followed by a zero-padded, at-least-6-digit sequence number. Formatted
and parsed by `src/lib/barcode-code.ts` (`formatBarcodeCode`,
`parseBarcodeCode`) — a small, pure, fully unit-tested module
(`tests/barcode-code.test.ts`).

## There is only one identifier, shown two ways

The spec requires both a scannable barcode symbol and the human-readable
code, and explicitly warns against treating the visible "ZJ-000001" text
as if it were itself sufficient for a scanner. Rather than inventing a
second, separate numeric ID to encode, **the ZJ code is the scan payload**:
it's rendered as a real CODE128 barcode symbol (`<BarcodeSvg>`, via
`jsbarcode`), with the human-readable "ZJ-000001" text automatically
printed underneath it — standard barcode-label practice, and one less ID
scheme to keep in sync.

CODE128 was chosen because it natively encodes the full alphanumeric
"ZJ-NNNNNN" string (letters, digits, and the hyphen) without a translation
table, and is a standard symbology every commodity retail barcode scanner
supports.

## Generation: race-free by construction

> "Never reuse a barcode after an item is deleted. The identifier must be
> unique at the database level. Do not generate duplicate identifiers
> through concurrent requests."

The naive approach — `SELECT MAX(sequence) + 1` then insert — races under
concurrency: two simultaneous "Add Stock" submissions can both read the
same max and both try to insert the same next number. Instead,
`Barcode.sequence` is declared:

```prisma
sequence Int @unique @default(autoincrement())
```

Prisma maps this to a native Postgres `IDENTITY`/`SERIAL` column backed by
a database sequence. `nextval()` on a Postgres sequence is atomic and
lock-free at the database level — two concurrent inserts are guaranteed
different values by Postgres itself, not by application logic, and a
sequence never rewinds or reuses a value even if the transaction that
consumed it is rolled back. This is proven directly in
`tests/inventory-item.service.integration.test.ts`, which fires 8
concurrent `createInventoryItem()` calls and asserts all 8 sequences come
back unique — plus a direct test that inserting a duplicate `sequence`
value violates the database's own unique constraint.

`Barcode` is created inside the same `$transaction` as its `InventoryItem`
and `Product` (`inventory-item.service.ts`), so a stock item is never left
without a barcode, and a barcode is never created without an item.

Archiving an item (`archiveInventoryItem`) never deletes its `Barcode` row
— the sequence is permanently retired, never available for reuse, exactly
as the spec requires.

## Printing

Two Server Actions, both gated by the `barcode:print` permission and both
recording the print event (`Barcode.printCount`, `Barcode.lastPrintedAt`,
and a `BARCODE_PRINTED` `AuditLog` entry) before the browser's print dialog
opens:

- `recordBarcodePrintAction(inventoryItemId)` — single label, from the item
  detail page or the All Stock table's print action.
- `recordBarcodePrintsAction(inventoryItemIds)` — batch, from
  **Inventory → Barcodes**: check any number of items, "Print Selected"
  navigates to `/inventory/barcodes/print?ids=...`, which renders every
  selected label in a grid and prints them together.

`<PrintButton>` (`src/components/inventory/print-button.tsx`) is the shared
client component behind both: it calls the bound Server Action first, then
`window.print()` only if that succeeds — a user without the permission
sees a toast error and nothing prints.

### Print-only layout

Every print page (`[id]/print/barcode`, `[id]/print/product`,
`barcodes/print`) still renders inside the normal `(app)` route — same
layout, same auth checks — but the sidebar, topbar, and inventory sub-nav
tabs all carry a `print:hidden` Tailwind class, so the browser's print
output shows only the label/sheet content, not the app chrome. No separate
print route tree needed.

## Label contents

Per the spec, every label includes:

```
ZARGHOON JEWELLERS
<Product Name>
<Purity>
[barcode symbol]
ZJ-000001
Gross: 10.500 g   Rs. 450,000
```

`<BarcodeLabel>` (`src/components/inventory/barcode-label.tsx`) renders
this. Its dimensions are CSS custom properties
(`--zj-label-width`/`--zj-label-height`, defaulting to 50mm × 30mm) rather
than a fixed pixel size — per the spec's "prepare the printing architecture
so label dimensions can later be configured, do not hardcode one printer
model." A future Settings screen can override these variables per printer
without touching the component. No specific label-printer driver or model
is assumed anywhere in the code.

## Product print sheet

`<ProductPrintSheet>` (`src/components/inventory/product-print-sheet.tsx`)
is the separate, full "Print Product Information" layout: business name,
product photo, name, category, barcode (symbol + code), purity, net
weight, wastage, gross weight, gold rate, gold value, making/stone/other
charges, and selling price — everything the spec's product printout
section lists.

## Testing

`tests/barcode-code.test.ts` — format/parse round-tripping, case
insensitivity, malformed input, zero/negative rejection (8 tests).

`tests/inventory-item.service.integration.test.ts` — real-database proof of
uniqueness and monotonic sequence generation, including under concurrency,
plus the underlying unique-constraint enforcement (part of its 16 tests).

`e2e/inventory.spec.ts` — the barcode print page renders an actual `<svg>`
barcode and doesn't error for a permitted user.

## Known limitations

- No physical barcode-scanner input handling yet (reading a scan back into
  a search box) — that arrives with POS in a future phase.
- Label dimensions are configurable via CSS variables but there's no
  Settings UI yet to change them without editing code.
