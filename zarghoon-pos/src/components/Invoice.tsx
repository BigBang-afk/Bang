import { Printer, X } from "lucide-react";
import type { Sale } from "../store/salesStore";
import { formatMoney, formatDateTime } from "../lib/format";

export interface ShopInfo {
  shopName: string;
  shopTagline: string;
  shopAddress: string;
  shopPhone: string;
}

export function InvoiceDocument({
  sale,
  shop,
  currency,
}: {
  sale: Sale;
  shop: ShopInfo;
  currency: string;
}) {
  return (
    <div
      id="invoice"
      className="w-full bg-white p-10 text-neutral-900 shadow-2xl print:w-[210mm] print:min-h-[297mm] print:p-[14mm] print:shadow-none"
    >
      <div className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
        <div>
          <h1 className="font-serif text-2xl font-bold">{shop.shopName}</h1>
          <p className="text-xs text-neutral-600">{shop.shopTagline}</p>
          <p className="text-xs text-neutral-600">{shop.shopAddress}</p>
          <p className="text-xs text-neutral-600">{shop.shopPhone}</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold tracking-wide text-neutral-900">INVOICE</h2>
          <p className="text-xs text-neutral-600">Invoice #: {sale.invoiceNo}</p>
          <p className="text-xs text-neutral-600">Date: {formatDateTime(sale.date)}</p>
        </div>
      </div>

      <div className="mt-5 flex justify-between text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Billed To</p>
          <p className="font-medium">{sale.customerName || "Walk-in Customer"}</p>
          {sale.customerPhone && <p className="text-neutral-600">{sale.customerPhone}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500">Payment Method</p>
          <p className="font-medium">{sale.paymentMethod}</p>
        </div>
      </div>

      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
            <th className="py-2 pr-2">#</th>
            <th className="py-2 pr-2">Item</th>
            <th className="py-2 pr-2">Category</th>
            <th className="py-2 pr-2 text-right">Net Wt</th>
            <th className="py-2 pr-2 text-right">Gross Wt</th>
            <th className="py-2 pr-2 text-right">Rate/g</th>
            <th className="py-2 pr-2 text-right">Qty</th>
            <th className="py-2 pl-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it, i) => (
            <tr key={i} className="border-b border-neutral-200">
              <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
              <td className="py-2 pr-2">
                <div className="font-medium">{it.name}</div>
                <div className="text-[10px] text-neutral-500">{it.sku}</div>
              </td>
              <td className="py-2 pr-2 text-neutral-600">{it.category}</td>
              <td className="py-2 pr-2 text-right text-neutral-600">{it.netWeightGrams}g</td>
              <td className="py-2 pr-2 text-right text-neutral-600">{it.grossWeightGrams.toFixed(2)}g</td>
              <td className="py-2 pr-2 text-right text-neutral-600">{formatMoney(it.ratePerGram, currency)}</td>
              <td className="py-2 pr-2 text-right text-neutral-600">{it.qty}</td>
              <td className="py-2 pl-2 text-right font-medium">{formatMoney(it.lineTotal, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-600">Subtotal</span>
            <span>{formatMoney(sale.subtotal, currency)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-600">Discount</span>
              <span>-{formatMoney(sale.discount, currency)}</span>
            </div>
          )}
          <div className="flex justify-between border-t-2 border-neutral-900 pt-1.5 text-base font-bold">
            <span>Total</span>
            <span>{formatMoney(sale.total, currency)}</span>
          </div>
        </div>
      </div>

      <div className="mt-16 flex items-end justify-between text-[11px] text-neutral-500">
        <div className="max-w-xs">
          <p>Thank you for shopping with {shop.shopName}.</p>
          <p>Goods once sold are not exchangeable or refundable without this invoice.</p>
        </div>
        <div className="text-center">
          <div className="mb-1 w-40 border-b border-neutral-400" />
          <p>Authorized Signature</p>
        </div>
      </div>
    </div>
  );
}

export function InvoiceModal({
  sale,
  currency,
  shop,
  title = "Invoice",
  onClose,
  secondaryAction,
}: {
  sale: Sale;
  currency: string;
  shop: ShopInfo;
  title?: string;
  onClose: () => void;
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="animate-rise my-4 w-full max-w-3xl print:my-0 print:max-w-none">
        <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-gold-800/50 bg-ink-950 px-5 py-4 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-gold-100">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-gold-800/50 px-3 py-2 text-sm font-medium text-[#c9bd9e] hover:border-gold-600"
            >
              <Printer size={15} /> Print Invoice
            </button>
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
              >
                {secondaryAction.label}
              </button>
            )}
            <button onClick={onClose} className="ml-1 text-ink-500 hover:text-gold-300">
              <X size={18} />
            </button>
          </div>
        </div>

        <InvoiceDocument sale={sale} shop={shop} currency={currency} />
      </div>
    </div>
  );
}
