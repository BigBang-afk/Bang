"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate, formatPKR } from "@/lib/utils";

export function GoldRateHistoryChart({ data }: { data: { date: string; ratePerGram: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-charcoal/50">Rate history will appear here once available.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} fontSize={11} tickLine={false} />
        <YAxis fontSize={11} tickLine={false} width={80} tickFormatter={(v) => formatPKR(v)} />
        <Tooltip formatter={(v) => formatPKR(v as number)} labelFormatter={(d) => formatDate(d as string)} />
        <Line type="monotone" dataKey="ratePerGram" stroke="#c9a24b" strokeWidth={2} dot={false} name="24K Rate / gram" />
      </LineChart>
    </ResponsiveContainer>
  );
}
