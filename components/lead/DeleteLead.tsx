"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function DeleteLead({ leadId, name }: { leadId: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete ${name}? This removes all their messages and history and cannot be undone.`)) return;
    setBusy(true);
    const res = await api(`/api/leads/${leadId}`, "DELETE");
    if (!res.ok) {
      setBusy(false);
      alert(res.error);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={remove} disabled={busy} className="btn-danger btn-sm">
      {busy ? "Deleting…" : "Delete lead"}
    </button>
  );
}
