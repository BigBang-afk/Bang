"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { EmptyState } from "./equity-curve-chart";

const PALETTE = [
  "var(--color-accent)",
  "var(--color-gold)",
  "var(--color-positive)",
  "#a78bfa",
  "#38bdf8",
  "#fb923c",
  "var(--color-muted-2)",
];

export function CategoryPie({ data }: { data: { name: string; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) return <EmptyState />;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={100} paddingAngle={2} isAnimationActive={false}>
          {filtered.map((d, i) => (
            <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
