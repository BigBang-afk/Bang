"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants";

export function StatusSelect({ leadId, status }: { leadId: number; status: LeadStatus }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(next: LeadStatus) {
    if ((next === "Won" || next === "Lost") && !confirm(`Mark as ${next}? Pending follow-ups will be cancelled.`)) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    setError(null);
    const res = await api(`/api/leads/${leadId}/status`, "POST", { status: next });
    setBusy(false);
    if (!res.ok) {
      setValue(prev);
      return setError(res.error);
    }
    router.refresh();
  }

  return (
    <div>
      <label htmlFor="status" className="sr-only">
        Lead status
      </label>
      <select
        id="status"
        value={value}
        disabled={busy}
        onChange={(e) => change(e.target.value as LeadStatus)}
        className="input w-auto py-1.5 pr-8 font-medium"
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
