"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function AddNote({ leadId }: { leadId: number }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    setError(null);
    const res = await api(`/api/leads/${leadId}/notes`, "POST", { note });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNote("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
        placeholder="Log a call, reply or update…"
        className="input"
        aria-label="Add a note to the activity log"
      />
      <button type="submit" disabled={busy || !note.trim()} className="btn-secondary shrink-0">
        {busy ? "Saving…" : "Add note"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </form>
  );
}
