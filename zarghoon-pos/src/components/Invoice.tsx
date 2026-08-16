import { Printer, X } from "lucide-react";
import type { Sale } from "../store/salesStore";
import { formatMoney, formatDateTime, formatDate, numberToWords } from "../lib/format";

export interface ShopInfo {
  shopName: string;
  shopTagline: string;
  shopAddress: string;
  shopPhone: string;
}

function LogoMark() {
  return (
    <div
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2"
      style={{ borderColor: "#d4af37", background: "linear-gradient(135deg,#2a2318,#0a0908)" }}
    >
      <svg viewBox="0 0 24 24" width={26} height={26}>
        <defs>
          <linearGradient id="inv-logo-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f7e9b0" />
            <stop offset="50%" stopColor="#d4af37" />
            <stop offset="100%" stopColor="#9c7a22" />
          </linearGradient>
        </defs>
        <path d="M6 8 L12 3 L18 8 L12 21 Z" fill="url(#inv-logo-g)" />
      </svg>
    </div>
  );
}

function Barcode({ value }: { value: string }) {
  return (
    <div>
      <div
        className="h-9 w-48"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #171310 0, #171310 1.5px, transparent 1.5px, transparent 4px)",
        }}
      />
      <p className="mt-1 text-center text-[10px] tracking-[0.3em] text-neutral-500">{value}</p>
    </div>
  );
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
  const totalPieces = sale.items.reduce((sum, it) => sum + it.qty, 0);
  const totalNetWeight = sale.items.reduce((sum, it) => sum + it.netWeightGrams * it.qty, 0);
  const totalGrossWeight = sale.items.reduce((sum, it) => sum + it.grossWeightGrams * it.qty, 0);
  const totalWastageCharges = sale.items.reduce(
    (sum, it) => sum + (it.grossWeightGrams - it.netWeightGrams) * it.ratePerGram * it.qty,
    0
  );

  return (
    <div
      id="invoice"
      className="w-full bg-[#fbf7ec] p-8 text-neutral-900 shadow-2xl print:w-[210mm] print:min-h-[297mm] print:p-[12mm] print:shadow-none"
    >
      {/* Header panel */}
      <div
        className="flex items-start justify-between rounded-xl px-6 py-5"
        style={{ background: "linear-gradient(135deg,#171310,#0a0908)" }}
      >
        <div className="flex items-center gap-4">
          <LogoMark />
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-wide text-[#f3e6c8]">{shop.shopName}</h1>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37]">{shop.shopTagline}</p>
            <p className="mt-1.5 text-[11px] text-[#cbb98a]">{shop.shopAddress}</p>
            <p className="text-[11px] text-[#cbb98a]">{shop.shopPhone}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#f3e6c8]" style={{ borderColor: "#d4af37" }}>
            Cash Memo
          </span>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-[#a89a7d]">Invoice No.</p>
          <p className="font-serif text-lg font-semibold text-[#f3e6c8]">{sale.invoiceNo}</p>
          <p className="mt-1 text-[11px] text-[#cbb98a]">{formatDateTime(sale.date)}</p>
        </div>
      </div>

      {/* Customer / sale details */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#d9c99a] p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8a6d2f]">
            Customer Details
          </p>
          <p className="text-sm font-medium">{sale.customerName || "Walk-in Customer"}</p>
          {sale.customerPhone && <p className="text-xs text-neutral-600">{sale.customerPhone}</p>}
        </div>
        <div className="rounded-lg border border-[#d9c99a] p-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8a6d2f]">
            Sale Details
          </p>
          <div className="flex justify-between text-xs">
            <span className="text-neutral-600">Date</span>
            <span className="font-medium">{formatDate(sale.date)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-neutral-600">Payment Mode</span>
            <span className="font-medium">{sale.paymentMethod}</span>
          </div>
        </div>
      </div>

      {/* Items table */}
      <table className="mt-4 w-full border-collapse text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wide text-[#f3e6c8]" style={{ background: "#171310" }}>
            <th className="px-2 py-2">Sr</th>
            <th className="px-2 py-2">Item Code</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2 text-right">Gross Wt</th>
            <th className="px-2 py-2 text-right">Net Wt</th>
            <th className="px-2 py-2 text-right">Purity</th>
            <th className="px-2 py-2 text-right">Rate/g</th>
            <th className="px-2 py-2 text-right">Wastage</th>
            <th className="px-2 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it, i) => {
            const wastageValue = (it.grossWeightGrams - it.netWeightGrams) * it.ratePerGram * it.qty;
            return (
              <tr key={i} className="border-b border-[#e3d6ae]">
                <td className="px-2 py-2 text-neutral-500">{i + 1}</td>
                <td className="px-2 py-2 font-mono text-[11px] text-neutral-600">{it.sku}</td>
                <td className="px-2 py-2">
                  <div className="font-medium">{it.name}</div>
                  <div className="text-[10px] text-neutral-500">
                    {it.category} × {it.qty}
                  </div>
                </td>
                <td className="px-2 py-2 text-right text-neutral-600">{it.grossWeightGrams.toFixed(2)}g</td>
                <td className="px-2 py-2 text-right text-neutral-600">{it.netWeightGrams.toFixed(2)}g</td>
                <td className="px-2 py-2 text-right text-neutral-600">21K</td>
                <td className="px-2 py-2 text-right text-neutral-600">{formatMoney(it.ratePerGram, currency)}</td>
                <td className="px-2 py-2 text-right text-neutral-600">{formatMoney(wastageValue, currency)}</td>
                <td className="px-2 py-2 text-right font-semibold">{formatMoney(it.lineTotal, currency)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1.5 text-[10px] text-neutral-500">Total Pieces: {totalPieces}</p>

      {/* Price breakup + terms */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#d9c99a] p-4 text-[10px] leading-relaxed text-neutral-600">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8a6d2f]">
            Terms &amp; Conditions
          </p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Gold rate is subject to change without prior notice.</li>
            <li>Goods once sold will not be taken back or exchanged.</li>
            <li>Please check your item before leaving the store.</li>
            <li>All disputes are subject to local jurisdiction only.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-[#d9c99a]">
          <div
            className="rounded-t-lg px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[#f3e6c8]"
            style={{ background: "#171310" }}
          >
            Price Breakup
          </div>
          <div className="space-y-1 px-4 py-3 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Net Weight</span>
              <span>{totalNetWeight.toFixed(2)} g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Total Gross Weight</span>
              <span>{totalGrossWeight.toFixed(2)} g</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">Wastage / Making Charges</span>
              <span>{formatMoney(totalWastageCharges, currency)}</span>
            </div>
            <div className="flex justify-between border-t border-[#e3d6ae] pt-1">
              <span className="text-neutral-600">Sub Total</span>
              <span>{formatMoney(sale.subtotal, currency)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-neutral-600">Discount</span>
                <span>-{formatMoney(sale.discount, currency)}</span>
              </div>
            )}
          </div>
          <div
            className="flex items-center justify-between rounded-b-lg px-4 py-2 text-sm font-bold text-[#171310]"
            style={{ background: "linear-gradient(135deg,#f7e9b0,#d4af37)" }}
          >
            <span>Grand Total</span>
            <span>{formatMoney(sale.total, currency)}</span>
          </div>
        </div>
      </div>

      <p className="mt-2 text-right text-[10px] italic text-neutral-500">
        Amount in words: {numberToWords(sale.total)} {currency === "Rs" ? "Rupees" : currency}
      </p>

      {/* Footer */}
      <div className="mt-8 flex items-end justify-between border-t border-[#d9c99a] pt-4">
        <div className="max-w-xs text-[10px] text-neutral-500">
          <p className="font-medium text-neutral-700">Thank you for shopping with {shop.shopName}.</p>
          <p className="mt-0.5">Goods once sold are not exchangeable or refundable without this invoice.</p>
        </div>
        <Barcode value={sale.invoiceNo} />
        <div className="text-center">
          <div className="mb-1 w-36 border-b border-neutral-400" />
          <p className="text-[10px] text-neutral-500">Authorized Signature</p>
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
