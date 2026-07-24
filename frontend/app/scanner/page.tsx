"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";

interface TickerRow {
  symbol: string;
  price: string;
}

const SCAN_UNIVERSE = [
  "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT",
  "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "TRXUSDT",
];

export default function ScannerPage() {
  const [rows, setRows] = useState<Record<string, TickerRow>>({});

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      const results = await Promise.allSettled(
        SCAN_UNIVERSE.map(async (symbol) => {
          const res = await fetch(`/api/mexc/ticker/${symbol}`, { cache: "no-store" });
          if (!res.ok) throw new Error(await res.text());
          return (await res.json()) as { symbol: string; price: string };
        })
      );
      if (cancelled) return;
      setRows((prev) => {
        const next = { ...prev };
        results.forEach((r, i) => {
          if (r.status === "fulfilled") next[SCAN_UNIVERSE[i]] = { symbol: SCAN_UNIVERSE[i], price: r.value.price };
        });
        return next;
      });
    };

    poll();
    const interval = setInterval(poll, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <AppShell title="Live Market Scanner">
      <p className="text-sm text-gray-400 mb-4">
        Continuously refreshing USDT pairs. Full order-flow/volatility/breakout scoring runs as part of the AI
        Signal Engine — see the Signals page for scored setups.
      </p>
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-graphite">
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Last Price</th>
            </tr>
          </thead>
          <tbody>
            {SCAN_UNIVERSE.map((symbol) => (
              <tr key={symbol} className="border-b border-graphite/50 hover:bg-charcoal/50">
                <td className="px-4 py-3 font-medium text-white">{symbol}</td>
                <td className="px-4 py-3 font-mono text-gold">{rows[symbol]?.price ?? "…"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
