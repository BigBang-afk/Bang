"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export interface PerformancePoint {
  label: string;
  winRate: number;
}

export function PerformanceChart({ data }: { data: PerformancePoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-bg-border bg-bg-card text-sm text-muted">
        No performance data yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Win Rate Over Time</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#8b96a5" fontSize={12} />
          <YAxis stroke="#8b96a5" fontSize={12} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{
              background: "#131a26",
              border: "1px solid #1f2937",
              borderRadius: 8,
              color: "#fff",
            }}
          />
          <Line type="monotone" dataKey="winRate" stroke="#3b82f6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
