"use client";

import { useEffect, useState } from "react";

interface AdminStats {
  totalSignals: number;
  wins: number;
  losses: number;
  pending: number;
  overallWinRate: number;
  perPairStats: { pair: string; total: number; wins: number; losses: number; winRate: number }[];
  backtestRuns: {
    id: string;
    createdAt: string;
    pair: string;
    expiry: string;
    totalTrades: number;
    winRate: number;
    avgConfidence: number;
  }[];
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-bg-border bg-bg-panel px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/stats");
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => {
    load();
  }, []);

  const clear = async (scope: "history" | "backtests") => {
    if (!confirm(`Clear all ${scope}? This cannot be undone.`)) return;
    setBusy(true);
    await fetch(`/api/admin/stats?scope=${scope}`, { method: "DELETE" });
    await load();
    setBusy(false);
  };

  if (!stats) {
    return <div className="text-sm text-muted">Loading admin stats…</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-white">Admin Panel</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total Signals" value={String(stats.totalSignals)} />
        <StatTile label="Wins" value={String(stats.wins)} />
        <StatTile label="Losses" value={String(stats.losses)} />
        <StatTile label="Pending" value={String(stats.pending)} />
        <StatTile label="Win Rate" value={`${stats.overallWinRate.toFixed(1)}%`} />
      </div>

      <div className="rounded-xl border border-bg-border bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Performance by Pair</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Pair</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Wins</th>
                <th className="px-3 py-2">Losses</th>
                <th className="px-3 py-2">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {stats.perPairStats.map((p) => (
                <tr key={p.pair} className="border-b border-bg-border/60 last:border-0">
                  <td className="px-3 py-2 text-white">{p.pair}</td>
                  <td className="px-3 py-2 text-muted">{p.total}</td>
                  <td className="px-3 py-2 text-call-text">{p.wins}</td>
                  <td className="px-3 py-2 text-put-text">{p.losses}</td>
                  <td className="px-3 py-2 text-white">{p.winRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-bg-border bg-bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-white">Recent Backtest Runs</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-bg-border text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Pair</th>
                <th className="px-3 py-2">Expiry</th>
                <th className="px-3 py-2">Trades</th>
                <th className="px-3 py-2">Win Rate</th>
                <th className="px-3 py-2">Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              {stats.backtestRuns.map((r) => (
                <tr key={r.id} className="border-b border-bg-border/60 last:border-0">
                  <td className="px-3 py-2 text-muted">{new Date(r.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2 text-white">{r.pair}</td>
                  <td className="px-3 py-2 text-muted">{r.expiry === "SEC15" ? "15s" : "1m"}</td>
                  <td className="px-3 py-2 text-white">{r.totalTrades}</td>
                  <td className="px-3 py-2 text-white">{r.winRate.toFixed(1)}%</td>
                  <td className="px-3 py-2 text-white">{r.avgConfidence.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => clear("history")}
          disabled={busy}
          className="rounded-lg border border-put/40 bg-put-dim/40 px-4 py-2 text-sm font-medium text-put-text disabled:opacity-50"
        >
          Clear Live History
        </button>
        <button
          onClick={() => clear("backtests")}
          disabled={busy}
          className="rounded-lg border border-put/40 bg-put-dim/40 px-4 py-2 text-sm font-medium text-put-text disabled:opacity-50"
        >
          Clear Backtest Runs
        </button>
      </div>
    </div>
  );
}
