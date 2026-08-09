"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { EmptyState } from "./equity-curve-chart";

export function WinLossPie({ wins, losses, breakeven }: { wins: number; losses: number; breakeven: number }) {
  const total = wins + losses + breakeven;
  if (total === 0) return <EmptyState />;

  // Recharts fails to draw a single-slice pie that spans exactly 360deg, so
  // zero-value categories get a tiny epsilon to keep at least two arcs while
  // the tooltip still reports the real integer counts via `realValue`.
  const raw = [
    { name: "Wins", realValue: wins, color: "var(--color-positive)" },
    { name: "Losses", realValue: losses, color: "var(--color-negative)" },
    { name: "Breakeven", realValue: breakeven, color: "var(--color-muted-2)" },
  ];
  const nonZeroCount = raw.filter((d) => d.realValue > 0).length;
  const data = raw.map((d) => ({
    ...d,
    value: d.realValue > 0 ? d.realValue : nonZeroCount <= 1 ? total * 0.0001 : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} isAnimationActive={false}>
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
          formatter={(_value, name, entry) => [(entry?.payload as { realValue: number })?.realValue ?? 0, name]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "var(--color-muted)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
