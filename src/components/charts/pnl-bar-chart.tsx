"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { formatUsd } from "@/lib/money";
import { EmptyState } from "./equity-curve-chart";

export function PnlBarChart({ data, xKey, yKey }: { data: Record<string, unknown>[]; xKey: string; yKey: string }) {
  if (data.length === 0) return <EmptyState />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: "var(--color-muted)" }} minTickGap={30} />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} width={70} tickFormatter={(v) => formatUsd(v)} />
        <Tooltip
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
          formatter={(v) => formatUsd(Number(v))}
        />
        <Bar dataKey={yKey} radius={[3, 3, 0, 0]} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={(d[yKey] as number) >= 0 ? "var(--color-positive)" : "var(--color-negative)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
