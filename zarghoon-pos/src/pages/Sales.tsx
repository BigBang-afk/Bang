import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Receipt } from "lucide-react";
import { useSalesStore } from "../store/salesStore";
import { useSettingsStore } from "../store/settingsStore";
import { formatMoney, formatDateTime, todayKey } from "../lib/format";

type Filter = "today" | "week" | "all";

export default function Sales() {
  const sales = useSalesStore((s) => s.sales);
  const currency = useSettingsStore((s) => s.currency);
  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return sales;
    const now = new Date();
    const cutoff =
      filter === "today"
        ? todayKey()
        : todayKey(new Date(now.setDate(now.getDate() - 7)));
    return sales.filter((s) => (filter === "today" ? s.date.startsWith(cutoff) : s.date >= cutoff));
  }, [sales, filter]);

  const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-gold-100">Sales History</h1>
          <p className="text-sm text-ink-500">
            {filtered.length} invoice{filtered.length === 1 ? "" : "s"} · {formatMoney(totalRevenue, currency)} total
          </p>
        </div>
        <div className="flex gap-2">
          {(["today", "week", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition ${
                filter === f
                  ? "border-gold-600 bg-gold-500/15 text-gold-300"
                  : "border-gold-900/40 text-ink-500 hover:text-gold-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
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
                          <th className="pb-2 font-medium">Category / Net Wt</th>
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
                            <td className="py-2 text-ink-500">
                              {it.category} · {it.netWeightGrams}g
                            </td>
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
