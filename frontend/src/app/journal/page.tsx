"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, fetcher } from "@/lib/api";
import type { JournalEntryOut } from "@/types";

export default function JournalPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    symbol: "BTCUSDT",
    side: "long",
    entry_price: 0,
    quantity: 0,
    opened_at: new Date().toISOString().slice(0, 16),
    reason: "",
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["journal"],
    queryFn: () => fetcher<JournalEntryOut[]>("/journal"),
  });

  const createEntry = useMutation({
    mutationFn: () => api.post("/journal", { ...form, opened_at: new Date(form.opened_at).toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["journal"] });
      setShowForm(false);
    },
  });

  const entries = data || [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Trade Journal</h1>
          <p className="text-sm text-slate-500">Log entries, exits, reasoning, mistakes, and lessons for every trade.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="bg-accent-brand text-white rounded px-4 py-1.5 text-sm font-medium">
          {showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {showForm && (
        <div className="card p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <input
            placeholder="Symbol"
            value={form.symbol}
            onChange={(e) => setForm({ ...form, symbol: e.target.value.toUpperCase() })}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          />
          <select
            value={form.side}
            onChange={(e) => setForm({ ...form, side: e.target.value })}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          >
            <option value="long">Long</option>
            <option value="short">Short</option>
          </select>
          <input
            type="number"
            placeholder="Entry price"
            value={form.entry_price}
            onChange={(e) => setForm({ ...form, entry_price: Number(e.target.value) })}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          />
          <input
            type="number"
            placeholder="Quantity"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          />
          <input
            type="datetime-local"
            value={form.opened_at}
            onChange={(e) => setForm({ ...form, opened_at: e.target.value })}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm"
          />
          <input
            placeholder="Reason for entry"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="bg-base-800 border border-base-700 rounded px-2 py-1.5 text-sm md:col-span-2"
          />
          <button
            onClick={() => createEntry.mutate()}
            disabled={createEntry.isPending}
            className="bg-accent-buy text-white rounded px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            Save Entry
          </button>
        </div>
      )}

      <div className="card overflow-x-auto">
        {error && <div className="p-4 text-sm text-accent-sell">Sign in to view your journal.</div>}
        {!error && (
          <table className="w-full text-sm">
            <thead className="text-xs text-slate-500 uppercase">
              <tr>
                <th className="text-left px-3 py-2">Symbol</th>
                <th className="text-left px-3 py-2">Side</th>
                <th className="text-right px-3 py-2">Entry</th>
                <th className="text-right px-3 py-2">Exit</th>
                <th className="text-right px-3 py-2">PnL</th>
                <th className="text-right px-3 py-2">PnL %</th>
                <th className="text-left px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-base-800">
                  <td className="px-3 py-2 font-medium">{e.symbol}</td>
                  <td className={`px-3 py-2 ${e.side === "long" ? "text-accent-buy" : "text-accent-sell"}`}>{e.side}</td>
                  <td className="px-3 py-2 text-right mono-num">{e.entry_price}</td>
                  <td className="px-3 py-2 text-right mono-num">{e.exit_price ?? "open"}</td>
                  <td className={`px-3 py-2 text-right mono-num ${(e.pnl ?? 0) >= 0 ? "text-accent-buy" : "text-accent-sell"}`}>
                    {e.pnl ?? "–"}
                  </td>
                  <td className="px-3 py-2 text-right mono-num">{e.pnl_percent ?? "–"}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-xs truncate">{e.reason}</td>
                </tr>
              ))}
              {!isLoading && entries.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                    No journal entries yet.
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
