"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle, Phone, Trash2 } from "lucide-react";
import { updateInquiryStatusAction, updateInquiryNotesAction, deleteInquiryAction } from "@/app/admin/(protected)/inquiries/actions";
import { INQUIRY_STATUSES, type InquiryStatus } from "@/lib/constants";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatDateTime, formatPKR } from "@/lib/utils";
import { Td } from "@/components/admin/table";
import type { Inquiry } from "@/types/database";

export function InquiryRow({ inquiry, productName }: { inquiry: Inquiry; productName: string | null }) {
  const [status, setStatus] = useState<InquiryStatus>(inquiry.status);
  const [notes, setNotes] = useState(inquiry.admin_notes ?? "");
  const [isPending, startTransition] = useTransition();

  return (
    <tr>
      <Td>
        <p className="font-medium">{inquiry.inquiry_number}</p>
        <p className="text-xs text-charcoal/40">{formatDateTime(inquiry.created_at)}</p>
      </Td>
      <Td>
        <p>{inquiry.customer_name}</p>
        <p className="text-xs text-charcoal/40">{inquiry.mobile_number}</p>
      </Td>
      <Td>
        <p>{productName ?? "—"}</p>
        {inquiry.purity_snapshot && <p className="text-xs text-charcoal/40">{inquiry.purity_snapshot} · {inquiry.gross_weight_snapshot}g</p>}
        {inquiry.display_price_snapshot && <p className="text-xs text-charcoal/40">{formatPKR(inquiry.display_price_snapshot)}</p>}
      </Td>
      <Td className="max-w-[200px]">
        <p className="line-clamp-2 text-xs text-charcoal/60">{inquiry.message || "—"}</p>
      </Td>
      <Td>
        <select
          value={status}
          disabled={isPending}
          onChange={(e) => {
            const next = e.target.value as InquiryStatus;
            setStatus(next);
            startTransition(async () => {
              await updateInquiryStatusAction(inquiry.id, next);
              toast.success("Status updated");
            });
          }}
          className="rounded-sm border border-charcoal/20 px-2 py-1 text-xs capitalize"
        >
          {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </Td>
      <Td>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => startTransition(async () => {
            await updateInquiryNotesAction(inquiry.id, notes);
          })}
          rows={2}
          placeholder="Add notes…"
          className="w-40 rounded-sm border border-charcoal/20 px-2 py-1 text-xs"
        />
      </Td>
      <Td>
        <div className="flex items-center gap-1.5">
          {inquiry.whatsapp_number || inquiry.mobile_number ? (
            <a href={buildWhatsAppUrl(inquiry.whatsapp_number || inquiry.mobile_number, `Assalam-o-Alaikum ${inquiry.customer_name}, thank you for your inquiry (${inquiry.inquiry_number}) with Zarghoon Jewellers.`)}
              target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-sm p-1.5 text-[#25D366] hover:bg-green-50">
              <MessageCircle size={15} />
            </a>
          ) : null}
          <a href={`tel:${inquiry.mobile_number}`} aria-label="Call" className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5">
            <Phone size={15} />
          </a>
          <button
            type="button" aria-label="Delete" disabled={isPending}
            onClick={() => {
              if (!window.confirm("Delete this inquiry?")) return;
              startTransition(async () => { await deleteInquiryAction(inquiry.id); toast.success("Deleted"); });
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
