import type { Signal } from "@/lib/types";
import { ConfidenceMeter } from "@/components/ui/ConfidenceMeter";

export function SignalCard({ signal }: { signal: Signal }) {
  const isLong = signal.direction === "long";

  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{signal.symbol}</span>
          <span className={isLong ? "badge-long" : "badge-short"}>{signal.direction.toUpperCase()}</span>
        </div>
        <span className="text-xs text-gray-400">{signal.timeframe} · {signal.trading_mode}</span>
      </div>

      <ConfidenceMeter score={signal.confidence_score} />

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <div className="label-muted">Entry</div>
          <div className="text-white font-mono">{signal.entry_price}</div>
        </div>
        <div>
          <div className="label-muted">Stop Loss</div>
          <div className="text-bear font-mono">{signal.stop_loss}</div>
        </div>
        <div>
          <div className="label-muted">TP1 / TP2 / TP3</div>
          <div className="text-bull font-mono text-xs">
            {signal.take_profit_1} / {signal.take_profit_2} / {signal.take_profit_3}
          </div>
        </div>
        <div>
          <div className="label-muted">Risk / Reward</div>
          <div className="text-gold font-mono">{signal.risk_reward_ratio.toFixed(2)}R</div>
        </div>
      </div>

      <div className="border-t border-graphite pt-3">
        <div className="label-muted mb-1">Reasons</div>
        <ul className="text-xs text-gray-300 space-y-1 list-disc list-inside">
          {signal.reasons.slice(0, 4).map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="flex justify-between text-xs text-gray-500 pt-1">
        <span>Holding: {signal.estimated_holding_time}</span>
        <span>{signal.higher_timeframe_confirmed ? "HTF confirmed ✓" : "HTF not confirmed"}</span>
      </div>
    </div>
  );
}
