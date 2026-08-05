"use client";

import clsx from "clsx";
import { ConfidenceGauge } from "@/components/common/ConfidenceGauge";
import type { SignalOut } from "@/types";

export function SignalCard({ signal }: { signal: SignalOut }) {
  const isBuy = signal.direction === "BUY";

  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-lg text-slate-100">{signal.symbol}</span>
          <span className={clsx("text-xs font-bold px-2 py-0.5 rounded", isBuy ? "bg-accent-buy/20 text-accent-buy" : "bg-accent-sell/20 text-accent-sell")}>
            {signal.direction}
          </span>
          <span className="text-xs text-slate-500">{signal.timeframe}</span>
        </div>
        <span className="text-xs text-slate-500">RR {signal.risk_reward_ratio}:1</span>
      </div>

      <ConfidenceGauge score={signal.confidence_score} />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-slate-500">Entry</div>
          <div className="mono-num text-slate-200">
            {signal.entry_low} – {signal.entry_high}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Stop Loss</div>
          <div className="mono-num text-accent-sell">{signal.stop_loss}</div>
        </div>
        <div>
          <div className="text-slate-500">Hold Time</div>
          <div className="mono-num text-slate-200">{Math.round(signal.expected_holding_minutes / 60)}h</div>
        </div>
        <div>
          <div className="text-slate-500">TP1 / TP2 / TP3</div>
          <div className="mono-num text-accent-buy">
            {signal.take_profit_1} / {signal.take_profit_2} / {signal.take_profit_3}
          </div>
        </div>
        <div>
          <div className="text-slate-500">Leverage</div>
          <div className="mono-num text-slate-200">
            {signal.suggested_leverage_min}x – {signal.suggested_leverage_max}x
          </div>
        </div>
        <div>
          <div className="text-slate-500">Risk %</div>
          <div className="mono-num text-slate-200">{signal.suggested_risk_percent}%</div>
        </div>
      </div>

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer text-slate-300 select-none">Why this signal ({signal.reasons.length} reasons)</summary>
        <ul className="mt-2 list-disc list-inside space-y-1">
          {signal.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
