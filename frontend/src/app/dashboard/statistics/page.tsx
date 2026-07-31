"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/lib/config";
import { Card, CardTitle } from "@/components/ui/card";
import type { SignalStatistics } from "@/types";

function StatTile({ label, value }: { label: string; value: string | number }): React.ReactElement {
  return (
    <div className="rounded-lg border border-terminal-border bg-terminal-panel p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-100">{value}</p>
    </div>
  );
}

export default function StatisticsPage(): React.ReactElement {
  const [stats, setStats] = useState<SignalStatistics | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const response = await fetch(`${API_URL}/api/v1/signals/statistics`);
      if (!response.ok || cancelled) return;
      setStats(await response.json());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return <p className="text-gray-500">Loading statistics...</p>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Completed" value={stats.total_completed} />
        <StatTile label="Win Rate" value={`${stats.win_rate}%`} />
        <StatTile label="Wins / Losses / Draws" value={`${stats.wins} / ${stats.losses} / ${stats.draws}`} />
        <StatTile label="Max Losing Streak" value={stats.max_losing_streak} />
      </div>

      <Card>
        <CardTitle>Performance by Strategy</CardTitle>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Strategy</th>
              <th>Total</th>
              <th>Win Rate</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(stats.by_strategy).map(([code, s]) => (
              <tr key={code} className="border-t border-terminal-border">
                <td className="py-2">{code}</td>
                <td>{s.total}</td>
                <td>{s.win_rate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <p className="text-xs text-gray-500">
        Past performance does not guarantee future results. Prices are supplied by an independent market-data
        provider and may differ from prices on third-party trading platforms.
      </p>
    </div>
  );
}
