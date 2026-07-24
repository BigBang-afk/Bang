"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { StatCard } from "@/components/ui/StatCard";
import { api } from "@/lib/api";
import type { PerformanceSummary } from "@/lib/types";

export default function AnalyticsPage() {
  const [data, setData] = useState<PerformanceSummary | null>(null);

  useEffect(() => {
    api.get<PerformanceSummary>("/analytics/performance").then(setData).catch(() => {});
  }, []);

  return (
    <AppShell title="Performance Analytics">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Trades" value={`${data?.total_trades ?? 0}`} />
        <StatCard label="Win Rate" value={`${data?.win_rate ?? 0}%`} accent="text-bull" />
        <StatCard label="Profit Factor" value={`${data?.profit_factor ?? 0}`} />
        <StatCard label="Expectancy" value={`${data?.expectancy ?? 0}`} />
        <StatCard label="Sharpe Ratio" value={`${data?.sharpe_ratio ?? 0}`} />
        <StatCard label="Average Win" value={`${data?.average_win ?? 0}`} accent="text-bull" />
        <StatCard label="Average Loss" value={`${data?.average_loss ?? 0}`} accent="text-bear" />
        <StatCard label="Max Drawdown" value={`${data?.max_drawdown_pct ?? 0}%`} accent="text-bear" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Best Trading Pairs</h3>
          <ul className="space-y-2 text-sm">
            {(data?.best_pairs ?? []).map((p) => (
              <li key={p.symbol} className="flex justify-between">
                <span className="text-gray-300">{p.symbol}</span>
                <span className={p.pnl >= 0 ? "text-bull" : "text-bear"}>{p.pnl}</span>
              </li>
            ))}
            {(!data || data.best_pairs.length === 0) && <li className="text-gray-500">No closed trades yet.</li>}
          </ul>
        </div>
        <div className="card">
          <h3 className="font-semibold text-white mb-3">Best Trading Hours (UTC)</h3>
          <ul className="space-y-2 text-sm">
            {(data?.best_hours ?? []).map((h) => (
              <li key={h.hour} className="flex justify-between">
                <span className="text-gray-300">{h.hour}:00</span>
                <span className={h.pnl >= 0 ? "text-bull" : "text-bear"}>{h.pnl}</span>
              </li>
            ))}
            {(!data || data.best_hours.length === 0) && <li className="text-gray-500">No closed trades yet.</li>}
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
