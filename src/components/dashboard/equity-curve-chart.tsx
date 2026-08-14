"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { EquityPoint } from "@/lib/trading/performance";

function formatDollars(cents: number): string {
  const dollars = cents / 100;
  const abs = Math.abs(dollars).toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (dollars > 0) return `+$${abs}`;
  if (dollars < 0) return `-$${abs}`;
  return `$${abs}`;
}

export function EquityCurveChart({ equityCurve }: { equityCurve: EquityPoint[] }) {
  const data = equityCurve.map((p, i) => ({
    index: i + 1,
    date: new Date(p.date).toLocaleDateString(),
    dollars: p.cumulativePnlCents / 100,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="index"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v) => `#${v}`}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            tickFormatter={(v) => `$${v.toLocaleString()}`}
          />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
            formatter={(value) => [formatDollars(Number(value) * 100), "Cumulative P/L"]}
          />
          <Area
            type="monotone"
            dataKey="dollars"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#equityFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
