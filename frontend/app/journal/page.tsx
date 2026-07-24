"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api } from "@/lib/api";
import type { Trade } from "@/lib/types";

export default function JournalPage() {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    api.get<Trade[]>("/journal?limit=100").then(setTrades).catch(() => {});
  }, []);

  return (
    <AppShell title="Trade Journal">
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-graphite">
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Side</th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th className="px-4 py-3">PnL</th>
              <th className="px-4 py-3">R/R</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Opened</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6 text-center text-gray-500">
                  No trades logged yet.
                </td>
              </tr>
            )}
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-graphite/50 hover:bg-charcoal/50">
                <td className="px-4 py-3 font-medium text-white">{t.symbol}</td>
                <td className="px-4 py-3">
                  <span className={t.side === "long" ? "badge-long" : "badge-short"}>{t.side.toUpperCase()}</span>
                </td>
                <td className="px-4 py-3 font-mono">{t.entry_price}</td>
                <td className="px-4 py-3 font-mono">{t.exit_price ?? "—"}</td>
                <td className={`px-4 py-3 font-mono ${Number(t.pnl) >= 0 ? "text-bull" : "text-bear"}`}>
                  {t.pnl ?? "—"}
                </td>
                <td className="px-4 py-3 font-mono text-gold">{t.risk_reward_ratio ?? "—"}</td>
                <td className="px-4 py-3 text-gray-300 capitalize">{t.status}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(t.opened_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
