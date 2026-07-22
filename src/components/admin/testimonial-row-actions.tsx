"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Check, X, Star, Trash2 } from "lucide-react";
import { setTestimonialApprovalAction, setTestimonialFeaturedAction, deleteTestimonialAction } from "@/app/admin/(protected)/testimonials/actions";
import type { Testimonial } from "@/types/database";

export function TestimonialRowActions({ testimonial }: { testimonial: Testimonial }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/testimonials/${testimonial.id}/edit`} aria-label="Edit" className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5"><Pencil size={15} /></Link>
      {!testimonial.is_approved ? (
        <button type="button" title="Approve" disabled={isPending} onClick={() => startTransition(async () => { await setTestimonialApprovalAction(testimonial.id, true); toast.success("Approved"); })} className="rounded-sm p-1.5 text-green-600 hover:bg-green-50">
          <Check size={15} />
        </button>
      ) : (
        <button type="button" title="Reject" disabled={isPending} onClick={() => startTransition(async () => { await setTestimonialApprovalAction(testimonial.id, false); toast.success("Unapproved"); })} className="rounded-sm p-1.5 text-amber-600 hover:bg-amber-50">
          <X size={15} />
        </button>
      )}
      <button type="button" title="Toggle featured" disabled={isPending} onClick={() => startTransition(async () => { await setTestimonialFeaturedAction(testimonial.id, !testimonial.is_featured); toast.success("Updated"); })} className="rounded-sm p-1.5 text-charcoal/60 hover:bg-charcoal/5">
        <Star size={15} className={testimonial.is_featured ? "fill-gold text-gold" : ""} />
      </button>
      <button
        type="button" title="Delete" disabled={isPending}
        onClick={() => {
          if (!window.confirm("Delete this testimonial?")) return;
          startTransition(async () => { await deleteTestimonialAction(testimonial.id); toast.success("Deleted"); });
        }}
        className="rounded-sm p-1.5 text-red-500 hover:bg-red-50"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
