"use client";

import type { AnalysisResult, SignalFactor } from "@/lib/analysis/types";

function directionColor(direction: SignalFactor["direction"]): string {
  if (direction === "bullish") return "text-emerald-400";
  if (direction === "bearish") return "text-red-400";
  return "text-slate-400";
}

function FactorRow({ factor }: { factor: SignalFactor }) {
  const maxWeight = 25;
  const pct = Math.min(100, (factor.weight / maxWeight) * 100);
  const barColor =
    factor.direction === "bullish"
      ? "bg-emerald-500"
      : factor.direction === "bearish"
        ? "bg-red-500"
        : "bg-slate-500";

  return (
    <div className="py-2">
      <div className="flex items-center justify-between text-sm">
        <span className={`font-medium ${directionColor(factor.direction)}`}>{factor.label}</span>
        <span className="text-xs text-slate-400">+{factor.weight.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{factor.detail}</p>
    </div>
  );
}

export default function BreakdownPanel({ result }: { result: AnalysisResult }) {
  const sortedFactors = [...result.factors].sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Why this signal</h3>
        {sortedFactors.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">
            No strong candle patterns, level reactions, or trend bias found near the latest candles.
          </p>
        ) : (
          <div className="mt-2 divide-y divide-slate-800">
            {sortedFactors.map((f, i) => (
              <FactorRow factor={f} key={`${f.label}-${i}`} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Detected candle patterns</h3>
        {result.patterns.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">No notable patterns in the last few candles.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {result.patterns.map((p, i) => (
              <li key={`${p.name}-${i}`} className="text-xs">
                <span className={`font-medium ${directionColor(p.direction)}`}>{p.name}</span>{" "}
                <span className="text-slate-500">— {p.description}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Support &amp; resistance</h3>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-slate-500">Nearest support</p>
            <p className="text-emerald-400">
              {result.levels.nearestSupport
                ? `${result.levels.distanceToSupportPct?.toFixed(1)}% below · ${result.levels.nearestSupport.touches} touches · ${Math.round(result.levels.nearestSupport.score)}% strength`
                : "none nearby"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Nearest resistance</p>
            <p className="text-red-400">
              {result.levels.nearestResistance
                ? `${result.levels.distanceToResistancePct?.toFixed(1)}% above · ${result.levels.nearestResistance.touches} touches · ${Math.round(result.levels.nearestResistance.score)}% strength`
                : "none nearby"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="text-sm font-semibold text-slate-200">Trend</h3>
        <p className="mt-2 text-xs text-slate-400">
          Bias:{" "}
          <span className={directionColor(result.trend.slopeDirection)}>
            {result.trend.slopeDirection === "neutral" ? "sideways" : result.trend.slopeDirection}
          </span>{" "}
          · Momentum: {result.trend.bodyMomentum} · Streak: {result.trend.streak.length}{" "}
          {result.trend.streak.color} candle(s)
        </p>
      </section>
    </div>
  );
}
