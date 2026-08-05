"use client";

import { TradingChart } from "@/components/charts/TradingChart";
import { VolatilityPanel } from "@/components/scanner/VolatilityPanel";
import { SignalCard } from "@/components/signals/SignalCard";
import { StatCard } from "@/components/common/StatCard";
import { useScanner } from "@/hooks/useScanner";
import { useSettingsStore } from "@/store/useSettingsStore";

export default function DashboardPage() {
  const { tickers, opportunities, signals } = useScanner();
  const selectedSymbol = useSettingsStore((s) => s.selectedSymbol);

  const gainers = tickers.filter((t) => t.change_percent > 0).length;
  const losers = tickers.filter((t) => t.change_percent < 0).length;
  const topSignal = signals[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Pairs Scanned" value={tickers.length} />
        <StatCard label="Gainers / Losers" value={`${gainers} / ${losers}`} />
        <StatCard label="Active Signals" value={signals.length} tone={signals.length > 0 ? "positive" : "neutral"} />
        <StatCard
          label="Top Confidence"
          value={topSignal ? `${topSignal.confidence_score}%` : "–"}
          sublabel={topSignal?.symbol}
          tone={topSignal ? (topSignal.direction === "BUY" ? "positive" : "negative") : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 h-[520px]">
          <TradingChart symbol={selectedSymbol} />
        </div>
        <div className="h-[520px]">
          <VolatilityPanel opportunities={opportunities} />
        </div>
      </div>

      <div>
        <h2 className="text-slate-100 font-semibold mb-2">Latest AI Signals</h2>
        {topSignal ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {signals.slice(0, 3).map((s) => (
              <SignalCard key={s.symbol} signal={s} />
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-slate-500 text-sm">
            No signals meet the confidence threshold yet. The engine only emits a signal when multiple independent conditions align.
          </div>
        )}
      </div>
    </div>
  );
}
