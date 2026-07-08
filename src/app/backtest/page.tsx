"use client";

import { useRef, useState } from "react";
import { PairSelector } from "@/components/PairSelector";
import { ExpirySelector } from "@/components/ExpirySelector";
import { ExpiryKey, Pair } from "@/lib/types";

interface BacktestSummary {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgConfidence: number;
  bestPair: string;
  worstPair: string;
  winStreak: number;
  lossStreak: number;
  trades: {
    time: number;
    pair: string;
    direction: string;
    confidence: number;
    result: string;
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

export default function BacktestPage() {
  const [pair, setPair] = useState<Pair>("EUR/USD OTC");
  const [expiry, setExpiry] = useState<ExpiryKey>("1m");
  const [summary, setSummary] = useState<BacktestSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const runBacktest = async () => {
    setError(null);
    setSummary(null);
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a candle CSV file first (columns: time, open, high, low, close).");
      return;
    }
    setRunning(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("pair", pair);
      form.append("expiry", expiry);
      const res = await fetch("/api/backtest", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Backtest failed");
      setSummary(data.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Backtest failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-white">Backtesting</h1>

      <div className="flex flex-col gap-4 rounded-2xl border border-bg-border bg-bg-card p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <PairSelector value={pair} onChange={setPair} />
          <ExpirySelector value={expiry} onChange={setExpiry} />
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-wider text-muted">Candle CSV</label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="rounded-lg border border-bg-border bg-bg-panel px-3 py-2 text-sm text-white file:mr-3 file:rounded file:border-0 file:bg-accent/20 file:px-3 file:py-1 file:text-white"
            />
          </div>
          <button
            onClick={runBacktest}
            disabled={running}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:opacity-50"
          >
            {running ? "Running…" : "Run Backtest"}
          </button>
        </div>
        <p className="text-xs text-muted">
          CSV header must include: time, open, high, low, close (optionally a pair column). Time
          may be a unix timestamp or ISO date.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-put/40 bg-put-dim/40 p-3 text-sm text-put-text">
          {error}
        </div>
      )}

      {summary && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Total Trades" value={String(summary.totalTrades)} />
            <StatTile label="Wins" value={String(summary.wins)} />
            <StatTile label="Losses" value={String(summary.losses)} />
            <StatTile label="Win Rate" value={`${summary.winRate.toFixed(1)}%`} />
            <StatTile label="Avg Confidence" value={`${summary.avgConfidence.toFixed(1)}%`} />
            <StatTile label="Best Pair" value={summary.bestPair} />
            <StatTile label="Worst Pair" value={summary.worstPair} />
            <StatTile label="Win / Loss Streak" value={`${summary.winStreak} / ${summary.lossStreak}`} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-bg-border bg-bg-card">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-bg-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Pair</th>
                  <th className="px-4 py-3">Signal</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {summary.trades.slice(-100).map((t, i) => (
                  <tr key={i} className="border-b border-bg-border/60 last:border-0">
                    <td className="px-4 py-3 text-muted">
                      {new Date(t.time * 1000).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-white">{t.pair}</td>
                    <td
                      className={`px-4 py-3 font-bold ${
                        t.direction === "CALL" ? "text-call-text" : "text-put-text"
                      }`}
                    >
                      {t.direction}
                    </td>
                    <td className="px-4 py-3 text-white">{t.confidence}%</td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        t.result === "WIN" ? "text-call-text" : "text-put-text"
                      }`}
                    >
                      {t.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
