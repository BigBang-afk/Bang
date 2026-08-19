"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatDate } from "@/lib/format";

interface RatePoint {
  purity: "K24" | "K21" | "K18";
  ratePerGram: string;
  effectiveAt: string;
}

export function GoldRateChart({ days = 90 }: { days?: number }) {
  const [data, setData] = useState<Record<string, number | string>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/gold-rate?history=1&days=${days}`)
      .then((res) => res.json())
      .then((json: { history: RatePoint[] }) => {
        const byDate = new Map<string, Record<string, number | string>>();
        for (const point of json.history) {
          const key = formatDate(point.effectiveAt);
          const row = byDate.get(key) ?? { date: key };
          row[point.purity] = Number(point.ratePerGram);
          byDate.set(key, row);
        }
        setData(Array.from(byDate.values()));
      })
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) {
    return <div className="flex h-72 items-center justify-center text-brown-light">Loading chart…</div>;
  }

  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-brown-light">No rate history yet.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e8d6a033" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#4a3225" />
        <YAxis tick={{ fontSize: 11 }} stroke="#4a3225" width={70} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="K24" stroke="#a67f2e" strokeWidth={2} dot={false} name="24K" />
        <Line type="monotone" dataKey="K21" stroke="#5c0e21" strokeWidth={2} dot={false} name="21K" />
        <Line type="monotone" dataKey="K18" stroke="#c9a24b" strokeWidth={2} dot={false} name="18K" />
      </LineChart>
    </ResponsiveContainer>
  );
}
