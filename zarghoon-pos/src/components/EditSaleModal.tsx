import { useState } from "react";
import { X, Coins } from "lucide-react";
import { useSalesStore, type Sale, type PaymentMethod, type SaleEditableFields } from "../store/salesStore";
import { computeProfit } from "../lib/profit";
import { formatMoney } from "../lib/format";

const paymentMethods: PaymentMethod[] = ["Cash", "Card", "Bank Transfer"];

export default function EditSaleModal({
  sale,
  currency,
  onCancel,
  onSave,
}: {
  sale: Sale;
  currency: string;
  onCancel: () => void;
  onSave: (patch: SaleEditableFields) => void;
}) {
  const updateSaleGoldRate = useSalesStore((s) => s.updateSaleGoldRate);
  const [customerName, setCustomerName] = useState(sale.customerName);
  const [customerPhone, setCustomerPhone] = useState(sale.customerPhone);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(sale.paymentMethod);
  const [discount, setDiscount] = useState(sale.discount);
  const originalRate = sale.items[0]?.ratePerGram ?? 0;
  const [goldRate, setGoldRate] = useState(originalRate);

  const total = Math.max(0, sale.subtotal - discount);

  const previewProfit = sale.items.reduce((sum, it) => {
    const p = computeProfit(
      { ...it, ratePerGram: goldRate || it.ratePerGram },
      { subtotal: sale.subtotal, discount }
    );
    return sum + p.profitCash;
  }, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (goldRate > 0 && goldRate !== originalRate) {
      updateSaleGoldRate(sale.id, goldRate);
    }
    onSave({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMethod,
      discount: Math.max(0, discount),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="animate-rise max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gold-900/40 bg-ink-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gold-900/40 px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-gold-100">Edit {sale.invoiceNo}</h3>
          <button type="button" onClick={onCancel} className="text-ink-500 hover:text-gold-300">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Items (read-only)
            </span>
            <div className="space-y-1.5 rounded-lg border border-gold-900/30 bg-ink-900/40 p-3">
              {sale.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-[#c9bd9e]">
                    {it.name} × {it.qty}
                  </span>
                  <span className="text-ink-500">{formatMoney(it.lineTotal, currency)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Customer Name
              </span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Customer Phone
              </span>
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="input"
              />
            </label>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
              Payment Method
            </span>
            <div className="flex gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition ${
                    paymentMethod === m
                      ? "border-gold-600 bg-gold-500/15 text-gold-300"
                      : "border-gold-900/40 text-ink-500 hover:text-gold-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                Discount
              </span>
              <input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-[#a89a7d]">
                <Coins size={12} /> Gold Rate for Profit
              </span>
              <input
                type="number"
                min={0}
                value={goldRate || ""}
                onChange={(e) => setGoldRate(Number(e.target.value) || 0)}
                className="input"
              />
            </label>
          </div>
          <p className="-mt-2 text-[11px] text-ink-500">
            Revalues this sale's gold cost basis to recalculate profit — the invoice total charged to the
            customer stays unchanged.{" "}
            {goldRate > 0 && (
              <span className={previewProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                Profit at this rate: {formatMoney(previewProfit, currency)}
              </span>
            )}
          </p>

          <div className="space-y-1 rounded-lg border border-gold-900/40 bg-ink-900/40 p-3 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>Subtotal</span>
              <span>{formatMoney(sale.subtotal, currency)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-ink-500">
                <span>Discount</span>
                <span>-{formatMoney(discount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gold-900/30 pt-1.5 font-semibold text-gold-300">
              <span>Total</span>
              <span>{formatMoney(total, currency)}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gold-900/40 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gold-900/50 py-2.5 text-sm text-[#c9bd9e] hover:border-gold-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 py-2.5 text-sm font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
