"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { TradingModeModal } from "@/components/onboarding/TradingModeModal";
import { RiskSetupModal } from "@/components/onboarding/RiskSetupModal";
import { StatCard } from "@/components/ui/StatCard";
import { SignalCard } from "@/components/signals/SignalCard";
import { TradingViewWidget } from "@/components/charts/TradingViewWidget";
import { useSessionStore } from "@/lib/sessionStore";
import { api } from "@/lib/api";
import type { PerformanceSummary, Signal } from "@/lib/types";

export default function DashboardPage() {
  const { tradingMode, riskConfig, setTradingMode, setRiskConfig } = useSessionStore();
  const [step, setStep] = useState<"mode" | "risk" | "done">(tradingMode ? (riskConfig ? "done" : "risk") : "mode");
  const [performance, setPerformance] = useState<PerformanceSummary | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);

  useEffect(() => {
    if (step !== "done") return;
    api.get<PerformanceSummary>("/analytics/performance").then(setPerformance).catch(() => {});
    api.get<Signal[]>("/signals?limit=6").then(setSignals).catch(() => {});
  }, [step]);

  if (step === "mode") {
    return (
      <TradingModeModal
        onSelect={(mode) => {
          setTradingMode(mode);
          setStep("risk");
        }}
      />
    );
  }

  if (step === "risk" && tradingMode) {
    return (
      <RiskSetupModal
        tradingMode={tradingMode}
        onBack={() => setStep("mode")}
        onComplete={(config) => {
          setRiskConfig(config);
          setStep("done");
        }}
      />
    );
  }

  return (
    <AppShell title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Account Size" value={`$${riskConfig?.account_size.toLocaleString() ?? "-"}`} />
        <StatCard
          label="Win Rate"
          value={performance ? `${performance.win_rate}%` : "—"}
          accent={performance && performance.win_rate >= 50 ? "text-bull" : "text-bear"}
        />
        <StatCard label="Profit Factor" value={performance ? `${performance.profit_factor}` : "—"} />
        <StatCard label="Max Drawdown" value={performance ? `${performance.max_drawdown_pct}%` : "—"} accent="text-bear" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TradingViewWidget symbol="MEXC:BTCUSDT" interval={tradingMode === "scalping" ? "5" : "60"} />
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Session Configuration</h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-400">Trading mode</dt>
              <dd className="text-gold capitalize">{tradingMode}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Risk per trade</dt>
              <dd className="text-white">{riskConfig?.risk_per_trade_pct}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Max daily loss</dt>
              <dd className="text-white">{riskConfig?.max_daily_loss_pct}%</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Max simultaneous trades</dt>
              <dd className="text-white">{riskConfig?.max_simultaneous_trades}</dd>
            </div>
          </dl>
          <button className="btn-secondary w-full mt-4 text-xs" onClick={() => setStep("mode")}>
            Reconfigure session
          </button>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mt-8 mb-4">Today&apos;s Signals</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {signals.length === 0 && <p className="text-gray-400 text-sm">No high-confidence signals yet.</p>}
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </div>
    </AppShell>
  );
}
