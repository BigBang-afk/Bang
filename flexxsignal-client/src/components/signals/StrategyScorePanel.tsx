import type { SignalScoreDto } from "../../types/domain";

const ROWS: { key: keyof SignalScoreDto; label: string }[] = [
  { key: "trendScore", label: "Trend" },
  { key: "marketStructureScore", label: "Market structure" },
  { key: "momentumScore", label: "Momentum" },
  { key: "candlePressureScore", label: "Candle pressure" },
  { key: "supportResistanceScore", label: "Support / resistance" },
  { key: "breakoutScore", label: "Breakout / rejection" },
  { key: "multiTimeframeScore", label: "Multi-timeframe agreement" },
  { key: "volatilityScore", label: "Volatility quality" },
  { key: "dataQualityScore", label: "Data quality" },
  { key: "historicalStrategyScore", label: "Historical performance" },
];

export function StrategyScorePanel({ scores }: { scores: SignalScoreDto }) {
  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-100 font-semibold mb-4">Score breakdown</h3>
      <div className="space-y-3">
        {ROWS.map((r) => {
          const value = scores[r.key] as number;
          return (
            <div key={r.key}>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{r.label}</span>
                <span className="text-slate-300">{value.toFixed(0)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-navy-800 overflow-hidden">
                <div className="h-full bg-cyan-400" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
        <span className="text-sm text-slate-300">Final calibrated confidence</span>
        <span className="text-xl font-bold text-gold-400">{scores.finalCalibratedConfidence.toFixed(1)}%</span>
      </div>
    </div>
  );
}
