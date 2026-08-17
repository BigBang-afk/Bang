import { renderToBuffer } from "@react-pdf/renderer";
import { getCurrentUser, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSaleById, recordInvoiceDownload } from "@/services/sale.service";
import { getInvoiceBusinessInfo } from "@/services/sales-settings.service";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { InvoicePdfDocument } from "@/components/pos/invoice-pdf-document";

/**
 * Route Handlers aren't wrapped by the (app) layout's auth check, so every
 * check requirePermission() would normally do happens explicitly here. See
 * INVOICE-SYSTEM.md "PDF generation".
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const allowed = await userHasPermission(user, PERMISSIONS.SALES_VIEW);
  if (!allowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const [sale, business] = await Promise.all([getSaleById(id), getInvoiceBusinessInfo()]);
  if (!sale || !sale.invoice) {
    return new Response("Invoice not found", { status: 404 });
  }

  const buffer = await renderToBuffer(InvoicePdfDocument({ sale, business }));
  await recordInvoiceDownload(sale.id, user.id);

  const invoiceNumber = formatInvoiceNumber(sale.invoice.sequence);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoiceNumber}.pdf"`,
    },
  });
}
