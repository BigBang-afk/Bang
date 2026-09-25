"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { FOLLOW_UP_KIND_LABELS, type FollowUpKind, type LeadStatus } from "@/lib/constants";
import { StatusBadge } from "./StatusBadge";
import { DueLabel } from "./DueLabel";

export interface FollowUpItemData {
  id: number;
  lead_id: number;
  kind: FollowUpKind;
  due_date: string;
  note: string | null;
  lead_name: string;
  lead_status: LeadStatus;
  property_interest: string;
}

export function FollowUpItem({ item, todayStr }: { item: FollowUpItemData; todayStr: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function complete() {
    setBusy(true);
    setError(null);
    const res = await api(`/api/follow-ups/${item.id}`, "PATCH", { action: "complete" });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/leads/${item.lead_id}`} className="font-medium text-slate-900 hover:text-brand-600">
            {item.lead_name}
          </Link>
          <StatusBadge status={item.lead_status} />
          <span className="text-xs text-slate-400">·</span>
          <DueLabel date={item.due_date} todayStr={todayStr} />
        </div>
        <p className="mt-0.5 truncate text-sm text-slate-600">
          {FOLLOW_UP_KIND_LABELS[item.kind]}
          {item.note ? ` — ${item.note}` : ` · ${item.property_interest}`}
        </p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={`/leads/${item.lead_id}#messages`} className="btn-secondary btn-sm">
          Open messages
        </Link>
        <button onClick={complete} disabled={busy} className="btn-primary btn-sm">
          {busy ? "Saving…" : "Mark done"}
        </button>
      </div>
    </li>
  );
}
