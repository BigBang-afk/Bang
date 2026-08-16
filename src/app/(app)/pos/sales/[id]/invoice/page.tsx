import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSaleById } from "@/services/sale.service";
import { getInvoiceBusinessInfo } from "@/services/sales-settings.service";
import { recordInvoicePrintAction } from "@/lib/actions/sales.actions";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { formatCurrency } from "@/lib/format";
import { InvoicePrintSheet } from "@/components/pos/invoice-print-sheet";
import { PrintButton } from "@/components/inventory/print-button";
import { WhatsAppShareButton } from "@/components/pos/whatsapp-share-button";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Invoice | Zarghoon Jewellers" };

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission(PERMISSIONS.SALES_VIEW);
  const { id } = await params;

  const [sale, business] = await Promise.all([getSaleById(id), getInvoiceBusinessInfo()]);
  if (!sale || !sale.invoice) notFound();

  const invoiceNumber = formatInvoiceNumber(sale.invoice.sequence);
  const shareMessage = `Hi ${sale.customer?.name ?? ""}, here is your invoice ${invoiceNumber} from ${business.name} for ${formatCurrency(sale.grandTotal.toString())}. Thank you for shopping with us!`;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 sm:p-6">
      <div className="flex w-full max-w-3xl items-center justify-between print:hidden">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/pos/sales/${sale.id}`}>
            <ArrowLeft className="size-4" />
            Back
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <WhatsAppShareButton phone={sale.customer?.phone ?? null} message={shareMessage} />
          <Button variant="outline" size="sm" asChild>
            <Link href={`/api/invoices/${sale.id}/pdf`}>
              <Download className="size-4" />
              Download PDF
            </Link>
          </Button>
          <PrintButton onBeforePrint={recordInvoicePrintAction.bind(null, sale.id)} label="Print Invoice" />
        </div>
      </div>

      <InvoicePrintSheet sale={sale} business={business} />
    </div>
  );
}
