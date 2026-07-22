"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { MessageCircle, Phone, Trash2, ImageIcon } from "lucide-react";
import {
  updateCustomOrderStatusAction, updateCustomOrderNotesAction, deleteCustomOrderAction, getReferenceImageSignedUrlAction,
} from "@/app/admin/(protected)/custom-orders/actions";
import { CUSTOM_ORDER_STATUSES, type CustomOrderStatus } from "@/lib/constants";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { formatDateTime, formatPKR, formatWeight } from "@/lib/utils";
import { Td } from "@/components/admin/table";
import type { CustomOrder } from "@/types/database";

export function CustomOrderRow({ order }: { order: CustomOrder }) {
  const [status, setStatus] = useState<CustomOrderStatus>(order.status);
  const [notes, setNotes] = useState(order.admin_notes ?? "");
  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <tr>
      <Td>
        <p className="font-medium">{order.order_number}</p>
        <p className="text-xs text-charcoal/40">{formatDateTime(order.created_at)}</p>
      </Td>
      <Td>
        <p>{order.customer_name}</p>
        <p className="text-xs text-charcoal/40">{order.mobile_number}</p>
      </Td>
      <Td>
        <p>{order.jewelry_type}</p>
        <p className="text-xs text-charcoal/40">{order.gold_purity ?? "—"} {order.approx_weight_grams ? `· ${formatWeight(order.approx_weight_grams)}` : ""}</p>
        {order.budget && <p className="text-xs text-charcoal/40">Budget: {formatPKR(order.budget)}</p>}
      </Td>
      <Td className="max-w-[200px]">
        <p className="line-clamp-2 text-xs text-charcoal/60">{order.design_description || "—"}</p>
        {order.reference_image_url && (
          refUrl ? (
            <a href={refUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs text-gold-dark underline">Open Image</a>
          ) : (
            <button
              type="button"
              onClick={() => startTransition(async () => {
                const url = await getReferenceImageSignedUrlAction(order.reference_image_url!);
                setRefUrl(url);
              })}
              className="mt-1 inline-flex items-center gap-1 text-xs text-charcoal/50 hover:text-charcoal"
            >
              <ImageIcon size={12} /> View reference
            </button>
          )
        )}
      </Td>
      <Td>
        <select
          value={status}
          disabled={isPending}
          onChange={(e) => {
            const next = e.target.value as CustomOrderStatus;
            setStatus(next);
            startTransition(async () => {
              await updateCustomOrderStatusAction(order.id, next);
              toast.success("Status updated");
            });
          }}
          className="rounded-sm border border-charcoal/20 px-2 py-1 text-xs capitalize"
        >
          {CUSTOM_ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
      </Td>
      <Td>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => startTransition(async () => { await updateCustomOrderNotesAction(order.id, notes); })}
          rows={2}
          placeholder="Add notes…"
          className="w-40 rounded-sm border border-charcoal/20 px-2 py-1 text-xs"
        />
      </Td>
      <Td>
        <div className="flex items-center gap-1.5">
          {(order.whatsapp_number || order.mobile_number) && (
            <a href={buildWhatsAppUrl(order.whatsapp_number || order.mobile_number, `Assalam-o-Alaikum ${order.customer_name}, thank you for your custom order request (${order.order_number}) with Zarghoon Jewellers.`)}
              target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="rounded-sm p-1.5 text-[#25D366] hover:bg-green-50">
              <MessageCircle size={15} />
            </a>
          )}
          <a href={`tel:${order.mobile_number}`} aria-label="Call" className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5">
            <Phone size={15} />
          </a>
          <button
            type="button" aria-label="Delete" disabled={isPending}
            onClick={() => {
              if (!window.confirm("Delete this custom order?")) return;
              startTransition(async () => { await deleteCustomOrderAction(order.id); toast.success("Deleted"); });
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
