"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/api";
import { StatCard } from "@/components/common/StatCard";

interface Position {
  id: string;
  symbol: string;
  side: string;
  entry_price: number;
  quantity: number;
  leverage: number;
  stop_loss: number | null;
  take_profit: number | null;
  opened_at: string;
}

export default function PortfolioPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["portfolio-positions"],
    queryFn: () => fetcher<Position[]>("/portfolio/positions"),
  });

  const positions = data || [];
  const totalNotional = positions.reduce((sum, p) => sum + p.entry_price * p.quantity, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Portfolio</h1>
        <p className="text-sm text-slate-500">
          Open positions are sourced from your trade journal. Connecting your MEXC API key in Settings enables live account sync.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Open Positions" value={positions.length} />
        <StatCard label="Total Notional" value={`$${totalNotional.toFixed(2)}`} />
        <StatCard label="Longs / Shorts" value={`${positions.filter((p) => p.side === "long").length} / ${positions.filter((p) => p.side === "short").length}`} />
      </div>

      <div className="card overflow-x-auto">
        {error && <div className="p-4 text-sm text-accent-sell">Sign in to view your portfolio.</div>}
        {!error && (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Symbol</th>
                <th className="text-left px-3 py-2">Side</th>
                <th className="text-right px-3 py-2">Entry</th>
                <th className="text-right px-3 py-2">Qty</th>
                <th className="text-right px-3 py-2">Leverage</th>
                <th className="text-right px-3 py-2">Stop Loss</th>
                <th className="text-right px-3 py-2">Take Profit</th>
                <th className="text-right px-3 py-2">Opened</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id} className="border-t border-base-800">
                  <td className="px-3 py-2 font-medium">{p.symbol}</td>
                  <td className={`px-3 py-2 ${p.side === "long" ? "text-accent-buy" : "text-accent-sell"}`}>{p.side}</td>
                  <td className="px-3 py-2 text-right mono-num">{p.entry_price}</td>
                  <td className="px-3 py-2 text-right mono-num">{p.quantity}</td>
                  <td className="px-3 py-2 text-right mono-num">{p.leverage}x</td>
                  <td className="px-3 py-2 text-right mono-num">{p.stop_loss ?? "–"}</td>
                  <td className="px-3 py-2 text-right mono-num">{p.take_profit ?? "–"}</td>
                  <td className="px-3 py-2 text-right text-slate-500">{new Date(p.opened_at).toLocaleString()}</td>
                </tr>
              ))}
              {!isLoading && positions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                    No open positions. Log a trade in the Journal to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
