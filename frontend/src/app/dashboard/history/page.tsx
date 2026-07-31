"use client";

import { useEffect, useState } from "react";

import { API_URL } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import type { Signal } from "@/types";

export default function HistoryPage(): React.ReactElement {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      const response = await fetch(`${API_URL}/api/v1/signals/history?page=${page}&page_size=25`);
      if (!response.ok || cancelled) return;
      setSignals(await response.json());
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <Card>
      <CardTitle>Signal History</CardTitle>
      <p className="mb-3 text-xs text-gray-500">
        Every completed signal is shown here permanently, win or loss - nothing is ever hidden or removed.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Asset</th>
              <th>Strategy</th>
              <th>Direction</th>
              <th>Entry</th>
              <th>Expiry</th>
              <th>Confidence</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s) => (
              <tr key={s.public_signal_id} className="border-t border-terminal-border">
                <td className="py-2">{s.asset_symbol}</td>
                <td>{s.strategy_name}</td>
                <td>{s.direction}</td>
                <td className="font-mono">{formatPrice(s.entry_price)}</td>
                <td className="font-mono">{formatPrice(s.expiry_price)}</td>
                <td>{s.confidence.toFixed(1)}%</td>
                <td>
                  <Badge tone={s.result === "WIN" ? "call" : s.result === "LOSS" ? "put" : "neutral"}>
                    {s.result}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex justify-end gap-2 text-sm">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-md border border-terminal-border px-3 py-1 text-gray-300"
        >
          Prev
        </button>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="rounded-md border border-terminal-border px-3 py-1 text-gray-300"
        >
          Next
        </button>
      </div>
    </Card>
  );
}
