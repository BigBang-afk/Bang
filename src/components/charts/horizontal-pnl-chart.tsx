"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from "recharts";
import { formatUsd } from "@/lib/money";
import { EmptyState } from "./equity-curve-chart";

export function HorizontalPnlChart({ data }: { data: { name: string; netProfit: number }[] }) {
  if (data.length === 0) return <EmptyState />;
  const sorted = [...data].sort((a, b) => b.netProfit - a.netProfit).slice(0, 12);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 34)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis type="number" tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickFormatter={(v) => formatUsd(v)} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--color-muted)" }} width={90} />
        <Tooltip
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
          formatter={(v) => formatUsd(Number(v))}
        />
        <Bar dataKey="netProfit" radius={[0, 3, 3, 0]} isAnimationActive={false}>
          {sorted.map((d, i) => (
            <Cell key={i} fill={d.netProfit >= 0 ? "var(--color-positive)" : "var(--color-negative)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
