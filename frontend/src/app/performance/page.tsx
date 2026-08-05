"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { StatCard } from "@/components/common/StatCard";
import type { PerformanceSummary } from "@/types";

export default function PerformancePage() {
  const { data, error } = useQuery({
    queryKey: ["performance"],
    queryFn: () => fetcher<PerformanceSummary>("/performance"),
  });

  if (error) {
    return <div className="card p-8 text-center text-slate-500">Sign in to view your performance dashboard.</div>;
  }

  const p = data;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Performance</h1>
        <p className="text-sm text-slate-500">Computed from your closed trade journal entries.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Daily PnL" value={p?.daily_pnl ?? 0} tone={(p?.daily_pnl ?? 0) >= 0 ? "positive" : "negative"} />
        <StatCard label="Weekly PnL" value={p?.weekly_pnl ?? 0} tone={(p?.weekly_pnl ?? 0) >= 0 ? "positive" : "negative"} />
        <StatCard label="Monthly PnL" value={p?.monthly_pnl ?? 0} tone={(p?.monthly_pnl ?? 0) >= 0 ? "positive" : "negative"} />
        <StatCard label="Win Rate" value={p?.overall_win_rate != null ? `${p.overall_win_rate}%` : "–"} />
        <StatCard label="Average RR" value={p?.average_rr ?? "–"} />
        <StatCard label="Avg Hold Time" value={p?.average_hold_minutes != null ? `${Math.round(p.average_hold_minutes)}m` : "–"} />
        <StatCard label="Best Pair" value={p?.best_pair?.symbol ?? "–"} sublabel={p?.best_pair ? `${p.best_pair.pnl}` : undefined} tone="positive" />
        <StatCard label="Worst Pair" value={p?.worst_pair?.symbol ?? "–"} sublabel={p?.worst_pair ? `${p.worst_pair.pnl}` : undefined} tone="negative" />
        <StatCard label="Best Session" value={p?.best_session?.session ?? "–"} tone="positive" />
        <StatCard label="Worst Session" value={p?.worst_session?.session ?? "–"} tone="negative" />
        <StatCard label="Total Trades" value={p?.total_trades ?? 0} />
      </div>
    </div>
  );
}
