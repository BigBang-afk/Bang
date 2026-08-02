import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Receipt, Scale, Coins, Wallet, CalendarClock } from "lucide-react";
import { useSalesStore } from "../store/salesStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatMoney, formatDateTime, todayKey } from "../lib/format";
import StatCard from "../components/StatCard";

export default function Sales() {
  const sales = useSalesStore((s) => s.sales);
  const currency = useSettingsStore((s) => s.currency);
  const [fromDate, setFromDate] = useState(todayKey());
  const [toDate, setToDate] = useState(todayKey());
  const [expanded, setExpanded] = useState<string | null>(null);

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
                <button
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left"
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
                    {isOpen ? (
                      <ChevronUp size={16} className="text-ink-500" />
                    ) : (
                      <ChevronDown size={16} className="text-ink-500" />
                    )}
                  </div>
                </button>
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
    </div>
  );
}
