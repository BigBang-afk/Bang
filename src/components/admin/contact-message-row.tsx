"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle, Phone, Mail, Trash2 } from "lucide-react";
import { updateContactMessageStatusAction, deleteContactMessageAction } from "@/app/admin/(protected)/contact-messages/actions";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/constants";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatDateTime } from "@/lib/utils";
import { Td } from "@/components/admin/table";
import type { ContactMessage } from "@/types/database";

export function ContactMessageRow({ message }: { message: ContactMessage }) {
  const [status, setStatus] = useState<InquiryStatus>(message.status);
  const [isPending, startTransition] = useTransition();

  return (
    <tr>
      <Td>
        <p>{message.name}</p>
        <p className="text-xs text-charcoal/40">{formatDateTime(message.created_at)}</p>
      </Td>
      <Td className="text-xs text-charcoal/60">{message.mobile_number || message.email || "—"}</Td>
      <Td>{message.subject || "—"}</Td>
      <Td className="max-w-[240px]"><p className="line-clamp-3 text-xs text-charcoal/60">{message.message}</p></Td>
      <Td>
        <select
          value={status}
          disabled={isPending}
          onChange={(e) => {
            const next = e.target.value as InquiryStatus;
            setStatus(next);
            startTransition(async () => { await updateContactMessageStatusAction(message.id, next); toast.success("Status updated"); });
          }}
          className="rounded-sm border border-charcoal/20 px-2 py-1 text-xs capitalize"
        >
          {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </Td>
      <Td>
        <div className="flex items-center gap-1.5">
          {(message.whatsapp_number || message.mobile_number) && (
            <a href={buildWhatsAppUrl(message.whatsapp_number || message.mobile_number!, `Assalam-o-Alaikum ${message.name}, thank you for contacting Zarghoon Jewellers.`)}
              target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-sm p-1.5 text-[#25D366] hover:bg-green-50">
              <MessageCircle size={15} />
            </a>
          )}
          {message.mobile_number && (
            <a href={`tel:${message.mobile_number}`} aria-label="Call" className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5"><Phone size={15} /></a>
          )}
          {message.email && (
            <a href={`mailto:${message.email}`} aria-label="Email" className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5"><Mail size={15} /></a>
          )}
          <button
            type="button" aria-label="Delete" disabled={isPending}
            onClick={() => {
              if (!window.confirm("Delete this message?")) return;
              startTransition(async () => { await deleteContactMessageAction(message.id); toast.success("Deleted"); });
            }}
            className="rounded-sm p-1.5 text-red-500 hover:bg-red-50"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </Td>
    </tr>
  );
}
