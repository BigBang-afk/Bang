"use client";

import { useState } from "react";
import clsx from "clsx";
import type { TickerEntry } from "@/types";
import { useSettingsStore } from "@/store/useSettingsStore";

type SortKey = "opportunity_score" | "change_percent" | "quote_volume" | "range_percent";

export function ScannerTable({ tickers }: { tickers: TickerEntry[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("opportunity_score");
  const [filter, setFilter] = useState("");
  const setSelectedSymbol = useSettingsStore((s) => s.setSelectedSymbol);

  const rows = [...tickers]
    .filter((t) => t.symbol.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => b[sortKey] - a[sortKey])
    .slice(0, 100);

  const columns: { key: SortKey; label: string }[] = [
    { key: "opportunity_score", label: "Score" },
    { key: "change_percent", label: "24h %" },
    { key: "range_percent", label: "Range %" },
    { key: "quote_volume", label: "Quote Vol" },
  ];

  return (
    <div className="card overflow-hidden flex flex-col h-full">
      <div className="p-3 border-b border-base-700 flex items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter symbol…"
          className="bg-base-800 border border-base-700 rounded px-2 py-1 text-sm flex-1"
        />
        <span className="text-xs text-slate-500">{rows.length} pairs</span>
      </div>
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-base-900 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-3 py-2">Symbol</th>
              <th className="text-right px-3 py-2">Price</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={clsx("text-right px-3 py-2 cursor-pointer hover:text-slate-200", sortKey === c.key && "text-accent-brand")}
                  onClick={() => setSortKey(c.key)}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr
                key={t.symbol}
                onClick={() => setSelectedSymbol(t.symbol)}
                className="border-t border-base-800 hover:bg-base-800/50 cursor-pointer"
              >
                <td className="px-3 py-1.5 font-medium text-slate-200">{t.symbol}</td>
                <td className="px-3 py-1.5 text-right mono-num">{t.price}</td>
                <td className={clsx("px-3 py-1.5 text-right mono-num", t.change_percent >= 0 ? "text-accent-buy" : "text-accent-sell")}>
                  {t.change_percent > 0 ? "+" : ""}
                  {t.change_percent}%
                </td>
                <td className="px-3 py-1.5 text-right mono-num">{t.range_percent}%</td>
                <td className="px-3 py-1.5 text-right mono-num">${(t.quote_volume / 1_000_000).toFixed(2)}M</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
