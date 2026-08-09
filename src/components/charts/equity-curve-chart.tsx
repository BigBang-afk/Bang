"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatUsd } from "@/lib/money";

export function EquityCurveChart({ data }: { data: { date: string; balance: number }[] }) {
  if (data.length === 0) {
    return <EmptyState />;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} minTickGap={40} />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} width={70} tickFormatter={(v) => formatUsd(v)} />
        <Tooltip
          contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
          formatter={(v) => formatUsd(Number(v))}
        />
        <Area type="monotone" dataKey="balance" stroke="var(--color-accent)" strokeWidth={2} fill="url(#equityFill)" isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function EmptyState() {
  return <div className="flex h-[280px] items-center justify-center text-sm text-muted">Not enough data yet.</div>;
}
