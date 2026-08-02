import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Receipt, Scale, Coins, Wallet, CalendarClock, Printer, X } from "lucide-react";
import { useSalesStore, type Sale } from "../store/salesStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatMoney, formatDateTime, formatDate, todayKey } from "../lib/format";
import StatCard from "../components/StatCard";
import { InvoiceModal } from "../components/Invoice";

export default function Sales() {
  const sales = useSalesStore((s) => s.sales);
  const currency = useSettingsStore((s) => s.currency);
  const shop = useSettingsStore();
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [printingSale, setPrintingSale] = useState<Sale | null>(null);
  const [showReport, setShowReport] = useState(false);

  const isToday = fromDate === todayKey() && toDate === todayKey();

  const filtered = useMemo(() => {
    return sales.filter((s) => {
      const day = s.date.slice(0, 10);
      return day >= fromDate && day <= toDate;
    });
  }, [sales, fromDate, toDate]);

  const totals = useMemo(() => {
    let netWeight = 0;
    let grossWeight = 0;
    let salePrice = 0;
    let total = 0;
    for (const s of filtered) {
      salePrice += s.subtotal;
      total += s.total;
      for (const it of s.items) {
        netWeight += it.netWeightGrams * it.qty;
        grossWeight += it.grossWeightGrams * it.qty;
      }
    }
    return { netWeight, grossWeight, salePrice, total };
  }, [filtered]);

  function resetToToday() {
    setFromDate(todayKey());
    setToDate(todayKey());
  }

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">Sales History</h1>
          <p className="text-sm text-ink-500">
            {filtered.length} invoice{filtered.length === 1 ? "" : "s"} ·{" "}
            {isToday ? "Today" : `${fromDate} → ${toDate}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={resetToToday}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${
              isToday
                ? "border-gold-600 bg-gold-500/15 text-gold-300"
                : "border-gold-900/40 text-ink-500 hover:text-gold-300"
            }`}
          >
            <CalendarClock size={14} /> Today
          </button>
          <label className="flex items-center gap-1.5 rounded-lg border border-gold-900/40 bg-ink-900/50 px-3 py-2 text-xs text-ink-500">
            From
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-transparent text-[#ece6d9] outline-none [color-scheme:dark]"
            />
          </label>
          <label className="flex items-center gap-1.5 rounded-lg border border-gold-900/40 bg-ink-900/50 px-3 py-2 text-xs text-ink-500">
            To
            <input
              type="date"
              value={toDate}
              min={fromDate}
              max={todayKey()}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-transparent text-[#ece6d9] outline-none [color-scheme:dark]"
            />
          </label>
          <button
            onClick={() => setShowReport(true)}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-gold-600 to-gold-500 px-3 py-2 text-xs font-semibold text-ink-950 hover:from-gold-500 hover:to-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Printer size={14} /> Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Net Weight"
          value={`${totals.netWeight.toFixed(2)} g`}
          icon={Scale}
        />
        <StatCard
          label="Total Gross Weight"
          value={`${totals.grossWeight.toFixed(2)} g`}
          icon={Scale}
        />
        <StatCard
          label="Sale Price"
          value={formatMoney(totals.salePrice, currency)}
          icon={Coins}
          hint="Subtotal before discount"
        />
        <StatCard
          label="Total of Sale Price"
          value={formatMoney(totals.total, currency)}
          icon={Wallet}
          accent
          hint="Final total after discount"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gold-900/25 bg-ink-900/40 py-16">
          <Receipt size={32} className="mb-3 text-ink-600" />
          <p className="text-sm text-ink-500">No transactions for this period.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const isOpen = expanded === s.id;
            return (
              <div
                key={s.id}
                className="overflow-hidden rounded-xl border border-gold-900/25 bg-ink-900/40"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setExpanded(isOpen ? null : s.id);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-3.5 text-left"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gold-300">{s.invoiceNo}</span>
                      <span className="text-xs text-ink-500">{formatDateTime(s.date)}</span>
                    </div>
                    <div className="text-sm text-[#c9bd9e]">
                      {s.customerName || "Walk-in customer"} · {s.items.length} item
                      {s.items.length === 1 ? "" : "s"} · {s.paymentMethod}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-serif text-lg font-semibold text-gold-200">
                      {formatMoney(s.total, currency)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPrintingSale(s);
                      }}
                      title="Print invoice"
                      className="rounded-md p-1.5 text-ink-500 hover:bg-ink-800 hover:text-gold-300"
                    >
                      <Printer size={15} />
                    </button>
                    {isOpen ? (
                      <ChevronUp size={16} className="text-ink-500" />
                    ) : (
                      <ChevronDown size={16} className="text-ink-500" />
                    )}
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-gold-900/25 px-5 py-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-ink-500">
                          <th className="pb-2 font-medium">Item</th>
                          <th className="pb-2 font-medium">Category</th>
                          <th className="pb-2 font-medium">Net Wt</th>
                          <th className="pb-2 font-medium">Gross Wt</th>
                          <th className="pb-2 font-medium">Kaat</th>
                          <th className="pb-2 font-medium">Rate</th>
                          <th className="pb-2 text-right font-medium">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.items.map((it, i) => (
                          <tr key={i} className="border-t border-gold-900/10">
                            <td className="py-2 text-[#ece6d9]">
                              {it.name} × {it.qty}
                            </td>
                            <td className="py-2 text-ink-500">{it.category}</td>
                            <td className="py-2 text-ink-500">{it.netWeightGrams}g</td>
                            <td className="py-2 text-ink-500">{it.grossWeightGrams.toFixed(2)}g</td>
                            <td className="py-2 text-ink-500">{it.kaat}</td>
                            <td className="py-2 text-ink-500">{formatMoney(it.ratePerGram, currency)}/g</td>
                            <td className="py-2 text-right text-[#c9bd9e]">{formatMoney(it.lineTotal, currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-3 flex justify-end gap-6 text-sm text-ink-500">
                      <span>Subtotal: {formatMoney(s.subtotal, currency)}</span>
                      {s.discount > 0 && <span>Discount: -{formatMoney(s.discount, currency)}</span>}
                      <span className="font-semibold text-gold-300">
                        Total: {formatMoney(s.total, currency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {printingSale && (
        <InvoiceModal
          sale={printingSale}
          currency={currency}
          shop={shop}
          title={`Invoice ${printingSale.invoiceNo}`}
          onClose={() => setPrintingSale(null)}
        />
      )}

      {showReport && (
        <SalesReportModal
          sales={filtered}
          totals={totals}
          rangeLabel={isToday ? "Today" : `${formatDate(fromDate)} — ${formatDate(toDate)}`}
          currency={currency}
          shop={shop}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}

function SalesReportModal({
  sales,
  totals,
  rangeLabel,
  currency,
  shop,
  onClose,
}: {
  sales: Sale[];
  totals: { netWeight: number; grossWeight: number; salePrice: number; total: number };
  rangeLabel: string;
  currency: string;
  shop: { shopName: string; shopTagline: string; shopAddress: string; shopPhone: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0 print:backdrop-blur-none">
      <div className="animate-rise my-4 w-full max-w-4xl print:my-0 print:max-w-none">
        <div className="flex items-center justify-between rounded-t-2xl border border-b-0 border-gold-800/50 bg-ink-950 px-5 py-4 print:hidden">
          <h3 className="font-serif text-lg font-semibold text-gold-100">Sales Report — {rangeLabel}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-lg border border-gold-800/50 px-3 py-2 text-sm font-medium text-[#c9bd9e] hover:border-gold-600"
            >
              <Printer size={15} /> Print Report
            </button>
            <button onClick={onClose} className="ml-1 text-ink-500 hover:text-gold-300">
              <X size={18} />
            </button>
          </div>
        </div>

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
              <h2 className="text-xl font-bold tracking-wide text-neutral-900">SALES REPORT</h2>
              <p className="text-xs text-neutral-600">Period: {rangeLabel}</p>
              <p className="text-xs text-neutral-600">Generated: {formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Invoices</p>
              <p className="font-semibold">{sales.length}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Net Weight</p>
              <p className="font-semibold">{totals.netWeight.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Gross Weight</p>
              <p className="font-semibold">{totals.grossWeight.toFixed(2)} g</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wide text-neutral-500">Total Revenue</p>
              <p className="font-semibold">{formatMoney(totals.total, currency)}</p>
            </div>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-y-2 border-neutral-900 text-left text-[11px] uppercase text-neutral-700">
                <th className="py-2 pr-2">#</th>
                <th className="py-2 pr-2">Invoice</th>
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Customer</th>
                <th className="py-2 pr-2 text-right">Items</th>
                <th className="py-2 pr-2">Payment</th>
                <th className="py-2 pr-2 text-right">Subtotal</th>
                <th className="py-2 pl-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <tr key={s.id} className="border-b border-neutral-200">
                  <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                  <td className="py-2 pr-2 font-medium">{s.invoiceNo}</td>
                  <td className="py-2 pr-2 text-neutral-600">{formatDateTime(s.date)}</td>
                  <td className="py-2 pr-2 text-neutral-600">{s.customerName || "Walk-in"}</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{s.items.length}</td>
                  <td className="py-2 pr-2 text-neutral-600">{s.paymentMethod}</td>
                  <td className="py-2 pr-2 text-right text-neutral-600">{formatMoney(s.subtotal, currency)}</td>
                  <td className="py-2 pl-2 text-right font-medium">{formatMoney(s.total, currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-neutral-900 text-sm font-bold">
                <td colSpan={6} />
                <td className="py-2 pr-2 text-right">{formatMoney(totals.salePrice, currency)}</td>
                <td className="py-2 pl-2 text-right">{formatMoney(totals.total, currency)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-16 text-[11px] text-neutral-500">
            <p>{shop.shopName} — Sales report generated from the private POS system.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
