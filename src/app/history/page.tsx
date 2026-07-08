"use client";

import { useEffect, useState } from "react";
import { SignalHistoryTable } from "@/components/SignalHistoryTable";
import { PerformanceChart, PerformancePoint } from "@/components/PerformanceChart";
import { PAIRS } from "@/lib/types";

interface HistorySignal {
  id: string;
  createdAt: string;
  pair: string;
  expiry: string;
  direction: string;
  confidence: number;
  result: string;
  reason: string;
}

export default function HistoryPage() {
  const [rows, setRows] = useState<HistorySignal[]>([]);
  const [pairFilter, setPairFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const qs = new URLSearchParams({ limit: "100" });
      if (pairFilter) qs.set("pair", pairFilter);
      const res = await fetch(`/api/history?${qs.toString()}`);
      const data = await res.json();
      setRows(data.signals ?? []);
      setLoading(false);
    };
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [pairFilter]);

  const chronological = [...rows].reverse();
  let runningWins = 0;
  let runningTotal = 0;
  const perfData: PerformancePoint[] = chronological
    .filter((r) => r.result !== "PENDING")
    .map((r, i) => {
      runningTotal++;
      if (r.result === "WIN") runningWins++;
      return { label: `#${i + 1}`, winRate: (runningWins / runningTotal) * 100 };
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-white">Signal History</h1>
        <select
          value={pairFilter}
          onChange={(e) => setPairFilter(e.target.value)}
          className="rounded-lg border border-bg-border bg-bg-card px-3 py-2 text-sm text-white"
        >
          <option value="">All Pairs</option>
          {PAIRS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <PerformanceChart data={perfData} />

      {loading ? (
        <div className="rounded-xl border border-bg-border bg-bg-card p-6 text-center text-sm text-muted">
          Loading history…
        </div>
      ) : (
        <SignalHistoryTable rows={rows} />
      )}
    </div>
  );
}
