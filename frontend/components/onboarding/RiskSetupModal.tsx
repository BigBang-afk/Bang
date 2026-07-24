"use client";

import { useState } from "react";
import type { RiskProfileConfig, TradingMode } from "@/lib/types";

const RISK_PRESETS = [0.25, 0.5, 1, 2];

export function RiskSetupModal({
  tradingMode,
  onComplete,
  onBack,
}: {
  tradingMode: TradingMode;
  onComplete: (config: RiskProfileConfig) => void;
  onBack: () => void;
}) {
  const [accountSize, setAccountSize] = useState(1000);
  const [riskPerTrade, setRiskPerTrade] = useState(0.5);
  const [maxDailyLoss, setMaxDailyLoss] = useState(3);
  const [maxWeeklyLoss, setMaxWeeklyLoss] = useState(6);
  const [maxDrawdown, setMaxDrawdown] = useState(15);
  const [maxSimultaneous, setMaxSimultaneous] = useState(3);

  const submit = () => {
    onComplete({
      account_size: accountSize,
      risk_per_trade_pct: riskPerTrade,
      max_daily_loss_pct: maxDailyLoss,
      max_weekly_loss_pct: maxWeeklyLoss,
      max_drawdown_pct: maxDrawdown,
      max_simultaneous_trades: maxSimultaneous,
      trading_mode: tradingMode,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-glow max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-1">Configure your risk</h2>
        <p className="text-sm text-gray-400 mb-6">
          These limits are enforced automatically — the platform will never let a trade exceed them.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label-muted">Account Size (USDT)</label>
            <input
              type="number"
              className="input-field w-full mt-1"
              value={accountSize}
              onChange={(e) => setAccountSize(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="label-muted">Risk Per Trade</label>
            <div className="flex gap-2 mt-1">
              {RISK_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setRiskPerTrade(p)}
                  className={`flex-1 py-2 rounded-lg text-sm border ${
                    riskPerTrade === p ? "border-gold bg-gold/10 text-gold" : "border-graphite text-gray-300"
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-muted">Max Daily Loss %</label>
              <input
                type="number"
                className="input-field w-full mt-1"
                value={maxDailyLoss}
                onChange={(e) => setMaxDailyLoss(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-muted">Max Weekly Loss %</label>
              <input
                type="number"
                className="input-field w-full mt-1"
                value={maxWeeklyLoss}
                onChange={(e) => setMaxWeeklyLoss(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-muted">Max Drawdown %</label>
              <input
                type="number"
                className="input-field w-full mt-1"
                value={maxDrawdown}
                onChange={(e) => setMaxDrawdown(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label-muted">Max Simultaneous Trades</label>
              <input
                type="number"
                className="input-field w-full mt-1"
                value={maxSimultaneous}
                onChange={(e) => setMaxSimultaneous(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn-secondary flex-1" onClick={onBack}>
            Back
          </button>
          <button className="btn-primary flex-1" onClick={submit}>
            Start Trading Session
          </button>
        </div>
      </div>
    </div>
  );
}
