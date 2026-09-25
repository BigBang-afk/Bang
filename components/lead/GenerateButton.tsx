"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function GenerateButton({ leadId, hasDrafts }: { leadId: number; hasDrafts: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (hasDrafts && !confirm("Replace the current unsent drafts with new ones?")) return;
    setBusy(true);
    setError(null);
    const res = await api(`/api/leads/${leadId}/generate`, "POST");
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button onClick={generate} disabled={busy} className="btn-primary">
        {busy ? (
          <>
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
            Generating…
          </>
        ) : hasDrafts ? (
          "Regenerate AI Follow-Up"
        ) : (
          "Generate AI Follow-Up"
        )}
      </button>
      {error && (
        <p role="alert" className="max-w-sm text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
