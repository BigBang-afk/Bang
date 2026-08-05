"use client";

import clsx from "clsx";
import type { OpportunityEntry } from "@/types";
import { useSettingsStore } from "@/store/useSettingsStore";

export function VolatilityPanel({ opportunities }: { opportunities: OpportunityEntry[] }) {
  const setSelectedSymbol = useSettingsStore((s) => s.setSelectedSymbol);

  return (
    <div className="card flex flex-col h-full">
      <div className="p-3 border-b border-base-700">
        <h3 className="font-semibold text-slate-100">Top High Volatility Opportunities</h3>
        <p className="text-xs text-slate-500">Ranked by momentum, ATR expansion, and liquidity — updates continuously.</p>
      </div>
      <div className="overflow-y-auto flex-1 divide-y divide-base-800">
        {opportunities.slice(0, 20).map((o) => (
          <button
            key={o.symbol}
            onClick={() => setSelectedSymbol(o.symbol)}
            className="w-full text-left px-3 py-2 hover:bg-base-800/50 flex items-center gap-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-200">{o.symbol}</span>
                <span
                  className={clsx(
                    "text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold",
                    o.trend_direction === "bullish" && "bg-accent-buy/20 text-accent-buy",
                    o.trend_direction === "bearish" && "bg-accent-sell/20 text-accent-sell",
                    o.trend_direction === "mixed" && "bg-base-700 text-slate-400"
                  )}
                >
                  {o.trend_direction}
                </span>
                {o.atr_expanding && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-warn/20 text-accent-warn">ATR↑</span>}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                RSI {o.rsi ?? "–"} · ADX {o.adx ?? "–"} · Vol regime: {o.volatility_regime}
                {o.patterns.length > 0 && ` · ${o.patterns.join(", ")}`}
              </div>
            </div>
            <div className={clsx("text-sm mono-num", o.change_percent >= 0 ? "text-accent-buy" : "text-accent-sell")}>
              {o.change_percent > 0 ? "+" : ""}
              {o.change_percent}%
            </div>
          </button>
        ))}
        {opportunities.length === 0 && (
          <div className="p-4 text-sm text-slate-500 text-center">No opportunities cached yet — waiting on scanner…</div>
        )}
      </div>
    </div>
  );
}
