"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/lib/config";
import { Card } from "@/components/ui/card";
import type { SignalStatistics } from "@/types";

export default function PerformancePage(): React.ReactElement {
  const [stats, setStats] = useState<SignalStatistics | null>(null);

  useEffect(() => {
    void fetch(`${API_URL}/api/v1/signals/statistics`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setStats);
  }, []);

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-16">
      <h1 className="text-2xl font-bold text-gray-100">Transparent Performance</h1>
      {stats ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <p className="text-xs text-gray-500">Total Completed</p>
            <p className="text-2xl font-bold text-gray-100">{stats.total_completed}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">Win Rate</p>
            <p className="text-2xl font-bold text-gray-100">{stats.win_rate}%</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">Wins</p>
            <p className="text-2xl font-bold text-green-400">{stats.wins}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">Losses</p>
            <p className="text-2xl font-bold text-red-400">{stats.losses}</p>
          </Card>
        </div>
      ) : (
        <p className="text-gray-500">Loading...</p>
      )}
      <p className="text-xs text-gray-500">
        Past performance does not guarantee future results. Prices are supplied by an independent market-data
        provider and may differ from prices on third-party trading platforms. Losing signals are never hidden or
        removed from these statistics.
      </p>
    </main>
  );
}
