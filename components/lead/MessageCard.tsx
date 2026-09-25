"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { MESSAGE_KIND_LABELS, type MessageKind } from "@/lib/constants";
import { CopyButton } from "./CopyButton";

export interface MessageCardData {
  id: number;
  kind: MessageKind;
  body: string;
  status: "draft" | "sent";
  sent_at: string | null;
  warnings: string[];
  sentLabel: string | null;
}

const WHEN: Record<MessageKind, string> = {
  immediate: "Send now",
  follow_up_1d: "Send 1 day after first reply",
  follow_up_3d: "Send 3 days after first reply",
};

export function MessageCard({
  message,
  phone,
  email,
  locked,
}: {
  message: MessageCardData;
  phone: string | null;
  email: string | null;
  /** True for follow-ups while the first response hasn't been sent yet. */
  locked: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sent = message.status === "sent";

  async function markSent() {
    setBusy(true);
    setError(null);
    const res = await api(`/api/messages/${message.id}/sent`, "POST");
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
  }

  const waNumber = phone?.replace(/[^\d]/g, "");
  const encoded = encodeURIComponent(message.body);

  return (
    <div className={`rounded-lg border p-4 ${sent ? "border-emerald-200 bg-emerald-50/40" : "border-slate-200 bg-white"}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{MESSAGE_KIND_LABELS[message.kind]}</h3>
          <p className="text-xs text-slate-500">{sent ? message.sentLabel : WHEN[message.kind]}</p>
        </div>
        {sent ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Sent</span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Draft</span>
        )}
      </div>

      <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{message.body}</p>

      {message.warnings.length > 0 && !sent && (
        <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          <p className="font-medium">Double-check before sending:</p>
          <ul className="mt-0.5 list-disc pl-4">
            {message.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopyButton text={message.body} />
        {waNumber && (
          <a className="btn-ghost btn-sm" href={`https://wa.me/${waNumber}?text=${encoded}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        )}
        {phone && (
          <a className="btn-ghost btn-sm" href={`sms:${phone.replace(/[^\d+]/g, "")}?body=${encoded}`}>
            SMS
          </a>
        )}
        {email && (
          <a className="btn-ghost btn-sm" href={`mailto:${encodeURIComponent(email)}?body=${encoded}`}>
            Email
          </a>
        )}
        {!sent && (
          <button
            type="button"
            onClick={markSent}
            disabled={busy || locked}
            title={locked ? "Send the immediate response first" : undefined}
            className="btn-primary btn-sm ml-auto"
          >
            {busy ? "Saving…" : "Mark as sent"}
          </button>
        )}
      </div>
      {locked && !sent && <p className="mt-2 text-right text-xs text-slate-400">Mark the immediate response as sent first.</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
