# Invoice System (Phase 3)

## Numbering

`Invoice.sequence` is a Postgres `Int @unique @default(autoincrement())`
column — the sole source of truth, exactly mirroring `Barcode.sequence`
from Phase 2. "ZJ-INV-000001" is *derived* from it at read time
(`src/lib/invoice-number.ts`: `formatInvoiceNumber()` / `parseInvoiceNumber()`),
never stored as a redundant string, so the two can never drift out of
sync. `parseInvoiceNumber()` deliberately does not accept a bare barcode
string ("ZJ-000001") — the two formats are distinguishable by their prefix,
proven in `tests/invoice-number.test.ts`.

Uniqueness under concurrent sales is guaranteed by the database column
itself (a real Postgres sequence), the same guarantee Phase 2 established
for barcode generation — proven under 6 simultaneous `completeSale()` calls
in `tests/sale-transaction.service.integration.test.ts`.

## Invoice document lifecycle

The `Invoice` row also tracks `printCount`/`lastPrintedAt` and
`downloadCount`/`lastDownloadedAt`, incremented by
`recordInvoicePrint()`/`recordInvoiceDownload()`
(`src/services/sale.service.ts`) — called right before `window.print()` on
the print page, and inside the PDF Route Handler, respectively. Both write
an audit log entry (`INVOICE_PRINTED` / `INVOICE_DOWNLOADED`).

## Print layout (A4)

`src/app/(app)/pos/sales/[id]/invoice/page.tsx` renders
`<InvoicePrintSheet>` — white background, black text, unconditionally,
regardless of the app's gold/black theme, so the invoice stays legible on
paper (the same choice Phase 2 made for `<ProductPrintSheet>`). It's a
Server Component: it fetches the sale and business info, formats every
`Decimal` inline via `.toString()`, and renders straight to HTML — the
`print:hidden` utility class (already global from Phase 1/2) hides the
sidebar/topbar/sub-nav/toolbar buttons so only the invoice itself prints.
`<PrintButton>` (reused as-is from Phase 2's barcode printing) records the
print via a Server Action, then calls `window.print()`.

The layout targets A4 with a max-width container and a 12-column item table
(Barcode, Product, Purity, Net Weight, Wastage, Gross Weight, Gold Rate,
Gold Value, Making, Stone, Diamond, Other, Price), followed by Subtotal/
Discount/Tax (only if enabled)/Grand Total/Paid/Balance, the payment
method(s) used, and a configurable footer (`invoice.footer_text` in
Settings, default "Thank you for shopping with Zarghoon Jewellers.").

No thermal/receipt-printer integration yet — the layout is written so a
future 80mm receipt template can be added as a second print route without
touching this one; Phase 3 deliberately does not assume a specific printer
model.

## PDF generation

`src/app/api/invoices/[id]/pdf/route.ts` — the app's first Route Handler,
used specifically because Server Actions aren't suited to binary file
downloads. It is **not** wrapped by any layout, so unlike a page under
`(app)/`, it calls `getCurrentUser()` and `userHasPermission(user,
PERMISSIONS.SALES_VIEW)` itself, explicitly, before touching the database
— returning `401`/`403`/`404` directly rather than redirecting (a redirect
makes no sense for a `fetch`/`<a>` download).

The PDF is real, generated server-side by `@react-pdf/renderer`
(`renderToBuffer`) from `<InvoicePdfDocument>` — the same sale/business
data `<InvoicePrintSheet>` renders to HTML, but expressed with react-pdf's
own `Document`/`Page`/`View`/`Text`/`StyleSheet` primitives (a different
rendering target, not HTML/CSS, so it's a separate component). This is a
real PDF file with selectable text, not a screenshot of a web page —
verified in `tests/invoice-pdf.integration.test.ts` by checking the output
starts with the literal `%PDF-` header and is non-trivially sized, and
end-to-end over a real authenticated browser session in `e2e/pos.spec.ts`.

The response sets `Content-Type: application/pdf` and
`Content-Disposition: attachment; filename="ZJ-INV-000001.pdf"`.

## WhatsApp-ready sharing

`<WhatsAppShareButton>` (`src/components/pos/whatsapp-share-button.tsx`)
deep-links to `https://wa.me/<digits>?text=<message>` using the sale's
customer's phone number, pre-filling a short message with the invoice
number, business name, and grand total. This is **architecture, not
automation** — per the spec, tapping it opens WhatsApp (Web or the app)
with the message ready to send; the staff member still has to press Send
themselves. There is no WhatsApp Business API integration, no background
sending, and no message is transmitted by the server. If the sale has no
customer or no phone on file, the button is disabled with an explanatory
tooltip instead of silently doing nothing.

## Business info & footer

`getInvoiceBusinessInfo()` (`src/services/sales-settings.service.ts`) reads
`business.name`, `business.currency`, `business.address`, `business.phone`,
and `invoice.footer_text` from `SystemSetting`, with sensible fallbacks —
never hardcoded into the invoice template itself, so an owner can update
their printed address/phone from Settings without a code change.
