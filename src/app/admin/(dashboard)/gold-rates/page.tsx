"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Card } from "@/components/admin/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatPkr, formatDateTime, purityLabel } from "@/lib/format";
import { GoldRateChart } from "@/components/charts/GoldRateChart";

interface RateHistoryItem {
  id: string;
  purity: "K24" | "K21" | "K18";
  ratePerGram: string;
  effectiveAt: string;
  notes: string | null;
  updatedByAdmin: { name: string } | null;
}

export default function GoldRatesPage() {
  const [current, setCurrent] = useState<{ K24: number | null; K21: number | null; K18: number | null }>({ K24: null, K21: null, K18: null });
  const [history, setHistory] = useState<RateHistoryItem[]>([]);
  const [form, setForm] = useState({ purity: "K21", ratePerGram: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/gold-rates?limit=50");
    const data = await res.json();
    setCurrent(data.current);
    setHistory(data.history ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gold-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save rate.");
        return;
      }
      setForm({ purity: form.purity, ratePerGram: "", notes: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-maroon">Gold Rates</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["K24", "K21", "K18"] as const).map((p) => (
          <Card key={p}>
            <p className="text-xs uppercase tracking-wider text-gold-dark">{purityLabel(p)} Gold</p>
            <p className="mt-2 font-display text-3xl text-maroon">{current[p] != null ? formatPkr(current[p]!, 0) : "—"}</p>
            <p className="text-xs text-brown-light">per gram</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Update Rate" className="h-fit">
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Select label="Purity" value={form.purity} onChange={(e) => setForm((f) => ({ ...f, purity: e.target.value }))}>
              <option value="K24">24K</option>
              <option value="K21">21K</option>
              <option value="K18">18K</option>
            </Select>
            <Input label="Rate per Gram (PKR)" type="number" step="0.01" required value={form.ratePerGram} onChange={(e) => setForm((f) => ({ ...f, ratePerGram: e.target.value }))} />
            <Textarea label="Notes (optional)" rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <p className="text-xs text-brown-light">
              This creates a new dated rate record — past history is never overwritten, and every
              product using this purity will immediately reflect the new price.
            </p>
            <Button type="submit" loading={saving}>Save New Rate</Button>
          </form>
        </Card>

        <Card title="Rate History Chart" className="lg:col-span-2">
          <GoldRateChart days={90} />
        </Card>
      </div>

      <Card title="Rate History">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold/15 text-left text-xs uppercase text-brown-light">
                <th className="py-2">Date</th>
                <th>Purity</th>
                <th>Rate / g</th>
                <th>Updated By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} className="border-b border-gold/10">
                  <td className="py-2">{formatDateTime(r.effectiveAt)}</td>
                  <td>{purityLabel(r.purity)}</td>
                  <td>{formatPkr(Number(r.ratePerGram), 0)}</td>
                  <td>{r.updatedByAdmin?.name ?? "—"}</td>
                  <td className="text-brown-light">{r.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
