import { formatCurrency, formatDate, formatWeight } from "@/lib/format";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { PURITY_LABELS } from "@/types/gold";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import type { SaleDetail } from "@/services/sale.service";
import type { InvoiceBusinessInfo } from "@/services/sales-settings.service";

/**
 * A4-oriented, print-first invoice layout — white/black regardless of the
 * app's gold/black theme so it stays legible on paper. Reused for on-screen
 * print preview and as the visual reference for the PDF route handler.
 */
export function InvoicePrintSheet({
  sale,
  business,
}: {
  sale: SaleDetail;
  business: InvoiceBusinessInfo;
}) {
  const taxEnabled = Number(sale.tax) > 0;

  return (
    <div className="mx-auto w-full max-w-3xl border border-border bg-white p-8 text-black print:border-0 print:p-0">
      <div className="mb-6 flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <p className="font-display text-2xl font-bold uppercase tracking-wide">{business.name}</p>
          {business.address && <p className="text-xs text-black/60">{business.address}</p>}
          {business.phone && <p className="text-xs text-black/60">{business.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">
            {sale.invoice ? formatInvoiceNumber(sale.invoice.sequence) : "INVOICE"}
          </p>
          <p className="text-xs text-black/60">{formatDate(sale.saleDate)}</p>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs uppercase tracking-wide text-black/50">Billed to</p>
        {sale.customer ? (
          <>
            <p className="font-medium">{sale.customer.name}</p>
            <p className="text-sm text-black/60">{sale.customer.phone}</p>
          </>
        ) : (
          <p className="font-medium">Walk-in Customer</p>
        )}
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-black text-left uppercase tracking-wide text-black/60">
            <th className="py-2 pr-2">Barcode</th>
            <th className="py-2 pr-2">Product</th>
            <th className="py-2 pr-2">Purity</th>
            <th className="py-2 pr-2 text-right">Net Wt.</th>
            <th className="py-2 pr-2 text-right">Wastage</th>
            <th className="py-2 pr-2 text-right">Gross Wt.</th>
            <th className="py-2 pr-2 text-right">Gold Rate</th>
            <th className="py-2 pr-2 text-right">Gold Value</th>
            <th className="py-2 pr-2 text-right">Making</th>
            <th className="py-2 pr-2 text-right">Stone</th>
            <th className="py-2 pr-2 text-right">Diamond</th>
            <th className="py-2 pr-2 text-right">Other</th>
            <th className="py-2 text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id} className="border-b border-black/10">
              <td className="py-2 pr-2 font-mono">{item.barcodeCode}</td>
              <td className="py-2 pr-2">{item.productName}</td>
              <td className="py-2 pr-2">{PURITY_LABELS[item.purity]}</td>
              <td className="py-2 pr-2 text-right">{formatWeight(item.netWeight.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatWeight(item.wastageWeight.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatWeight(item.grossWeight.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatCurrency(item.goldRatePerGram.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatCurrency(item.goldValue.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatCurrency(item.makingCharge.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatCurrency(item.stoneCharge.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatCurrency(item.diamondCharge.toString())}</td>
              <td className="py-2 pr-2 text-right">{formatCurrency(item.otherCharge.toString())}</td>
              <td className="py-2 text-right font-medium">{formatCurrency(item.finalPrice.toString())}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <div className="w-64 text-sm">
          <TotalRow label="Subtotal" value={formatCurrency(sale.subtotal.toString())} />
          <TotalRow label="Discount" value={`-${formatCurrency(sale.discount.toString())}`} />
          {taxEnabled && <TotalRow label="Tax" value={formatCurrency(sale.tax.toString())} />}
          <TotalRow label="Grand Total" value={formatCurrency(sale.grandTotal.toString())} strong />
          <TotalRow label="Paid" value={formatCurrency(sale.paidAmount.toString())} />
          <TotalRow label="Balance" value={formatCurrency(sale.balanceAmount.toString())} />
        </div>
      </div>

      <div className="mt-6 border-t border-black/10 pt-3">
        <p className="text-xs uppercase tracking-wide text-black/50">Payment</p>
        {sale.payments.map((payment) => (
          <p key={payment.id} className="text-sm">
            {PAYMENT_METHOD_LABELS[payment.method]}: {formatCurrency(payment.amount.toString())}
            {payment.reference ? ` (Ref: ${payment.reference})` : ""}
          </p>
        ))}
      </div>

      <div className="mt-10 border-t border-black/10 pt-4 text-center text-xs text-black/60">
        {business.footerText}
      </div>
    </div>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${strong ? "border-t border-black/20 pt-2 font-semibold" : ""}`}>
      <span className="text-black/60">{label}</span>
      <span>{value}</span>
    </div>
  );
}
