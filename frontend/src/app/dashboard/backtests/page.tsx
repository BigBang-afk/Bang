"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/lib/config";
import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { Asset, Strategy } from "@/types";

interface BacktestRun {
  id: string;
  strategy_id: string;
  asset_id: string;
  timeframe: string;
  expiry_seconds: number;
  status: string;
  metrics_json: Record<string, unknown>;
  error_message: string | null;
}

export default function BacktestsPage(): React.ReactElement {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [runs, setRuns] = useState<BacktestRun[]>([]);
  const [strategyId, setStrategyId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refreshRuns(): Promise<void> {
    try {
      const data = await apiRequest<BacktestRun[]>("/api/v1/backtests", { auth: true });
      setRuns(data);
    } catch {
      // requires login; ignore silently on public view
    }
  }

  useEffect(() => {
    void fetch(`${API_URL}/api/v1/strategies`).then((r) => r.json()).then(setStrategies);
    void fetch(`${API_URL}/api/v1/assets`).then((r) => r.json()).then(setAssets);
    void refreshRuns();
  }, []);

  async function runBacktest(): Promise<void> {
    if (!strategyId || !assetId) return;
    setSubmitting(true);
    try {
      const end = new Date();
      const start = new Date(end.getTime() - 1000 * 60 * 60 * 24 * 30);
      await apiRequest("/api/v1/backtests", {
        method: "POST",
        auth: true,
        body: {
          strategy_id: strategyId,
          asset_id: assetId,
          timeframe: "1m",
          expiry_seconds: 60,
          start: start.toISOString(),
          end: end.toISOString(),
          payout_ratio: 0.85,
        },
      });
      await refreshRuns();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Run a Backtest</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={strategyId}
            onChange={(e) => setStrategyId(e.target.value)}
            className="rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-sm text-gray-100"
          >
            <option value="">Select strategy</option>
            {strategies.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={assetId}
            onChange={(e) => setAssetId(e.target.value)}
            className="rounded-md border border-terminal-border bg-terminal-panel px-3 py-2 text-sm text-gray-100"
          >
            <option value="">Select asset</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.symbol}
              </option>
            ))}
          </select>
          <Button onClick={runBacktest} disabled={submitting || !strategyId || !assetId}>
            {submitting ? "Starting..." : "Run Backtest (30d)"}
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-500">Requires sign-in. Results never approve a strategy from a small sample.</p>
      </Card>

      <Card>
        <CardTitle>Backtest Runs</CardTitle>
        <ul className="space-y-2 text-sm">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center justify-between border-t border-terminal-border pt-2">
              <span className="text-gray-300">
                {run.timeframe} &middot; {run.expiry_seconds}s
              </span>
              <Badge tone={run.status === "completed" ? "call" : run.status === "failed" ? "put" : "info"}>
                {run.status}
              </Badge>
            </li>
          ))}
          {runs.length === 0 && <li className="text-gray-500">No backtests yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
