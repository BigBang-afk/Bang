"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { formatDate, formatPKR } from "@/lib/utils";

const GOLD = "#c9a24b";
const CHARCOAL = "#1a1a1a";

export function GoldRateLineChart({ data }: { data: { date: string; ratePerGram: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-charcoal/50">No gold rate history yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} fontSize={11} tickLine={false} />
        <YAxis fontSize={11} tickLine={false} width={70} tickFormatter={(v) => formatPKR(v)} />
        <Tooltip formatter={(v) => formatPKR(v as number)} labelFormatter={(d) => formatDate(d as string)} />
        <Line type="monotone" dataKey="ratePerGram" stroke={GOLD} strokeWidth={2} dot={false} name="24K Rate / gram" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data }: { data: { name: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-charcoal/50">No products yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="name" fontSize={11} tickLine={false} interval={0} angle={-20} textAnchor="end" height={60} />
        <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill={CHARCOAL} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MonthlyInquiriesChart({ data }: { data: { month: string; count: number }[] }) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-charcoal/50">No inquiries yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="month" fontSize={11} tickLine={false} />
        <YAxis fontSize={11} tickLine={false} allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill={GOLD} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
