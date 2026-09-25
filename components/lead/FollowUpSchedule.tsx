"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { FOLLOW_UP_KIND_LABELS, type FollowUpKind } from "@/lib/constants";
import { describeDueDate } from "@/lib/dates";

export interface FollowUpData {
  id: number;
  kind: FollowUpKind;
  due_date: string;
  note: string | null;
  status: "pending" | "done" | "cancelled";
}

export function FollowUpSchedule({
  leadId,
  followUps,
  todayStr,
  closed,
}: {
  leadId: number;
  followUps: FollowUpData[];
  todayStr: string;
  closed: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [editDate, setEditDate] = useState("");

  const pending = followUps.filter((f) => f.status === "pending");
  const history = followUps.filter((f) => f.status !== "pending").slice(0, 5);

  async function run(id: number | "new", fn: () => ReturnType<typeof api>) {
    setBusyId(id);
    setError(null);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) return setError(res.error);
    setEditing(null);
    router.refresh();
    return true;
  }

  async function schedule(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setError("Pick a date");
    const ok = await run("new", () => api(`/api/leads/${leadId}/follow-ups`, "POST", { due_date: date, note }));
    if (ok) {
      setDate("");
      setNote("");
    }
  }

  return (
    <div className="space-y-3">
      {pending.length === 0 ? (
        <p className="text-sm text-slate-500">No follow-up scheduled.</p>
      ) : (
        <ul className="space-y-2">
          {pending.map((f) => {
            const overdue = f.due_date < todayStr;
            return (
              <li key={f.id} className={`rounded-lg border p-3 ${overdue ? "border-red-200 bg-red-50/40" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{FOLLOW_UP_KIND_LABELS[f.kind]}</p>
                    <p className={`text-xs ${overdue ? "font-medium text-red-600" : f.due_date === todayStr ? "font-medium text-amber-700" : "text-slate-500"}`}>
                      {describeDueDate(f.due_date, todayStr)}
                      {f.due_date !== todayStr && !overdue ? "" : ` · ${f.due_date}`}
                    </p>
                    {f.note && <p className="mt-1 text-xs text-slate-600">{f.note}</p>}
                  </div>
                </div>
                {editing === f.id ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="input w-auto py-1 text-xs" aria-label="New date" />
                    <button
                      className="btn-primary btn-sm"
                      disabled={!editDate || busyId === f.id}
                      onClick={() => run(f.id, () => api(`/api/follow-ups/${f.id}`, "PATCH", { action: "reschedule", due_date: editDate }))}
                    >
                      Save
                    </button>
                    <button className="btn-ghost btn-sm" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      className="btn-secondary btn-sm"
                      disabled={busyId === f.id}
                      onClick={() => run(f.id, () => api(`/api/follow-ups/${f.id}`, "PATCH", { action: "complete" }))}
                    >
                      Mark done
                    </button>
                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setEditing(f.id);
                        setEditDate(f.due_date);
                      }}
                    >
                      Reschedule
                    </button>
                    <button
                      className="btn-ghost btn-sm text-slate-500"
                      disabled={busyId === f.id}
                      onClick={() => run(f.id, () => api(`/api/follow-ups/${f.id}`, "PATCH", { action: "cancel" }))}
                    >
                      Skip
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {closed ? (
        <p className="text-xs text-slate-500">This lead is closed. Change the status to schedule new follow-ups.</p>
      ) : (
        <form onSubmit={schedule} className="space-y-2 rounded-lg bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-700">Schedule next follow-up</p>
          <div className="flex gap-2">
            <input type="date" value={date} min={todayStr} onChange={(e) => setDate(e.target.value)} className="input py-1.5" aria-label="Follow-up date" required />
            <button type="submit" disabled={busyId === "new"} className="btn-primary btn-sm shrink-0">
              {busyId === "new" ? "Saving…" : "Add"}
            </button>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="What to do (optional)" className="input py-1.5" aria-label="Follow-up note" />
        </form>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {history.length > 0 && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer">Completed & skipped ({history.length})</summary>
          <ul className="mt-2 space-y-1">
            {history.map((f) => (
              <li key={f.id}>
                {f.status === "done" ? "✓" : "–"} {FOLLOW_UP_KIND_LABELS[f.kind]} · {f.due_date}
                {f.status === "cancelled" ? " (skipped)" : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
