"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Testimonial } from "@/types/database";
import type { ActionState } from "@/app/admin/(protected)/testimonials/actions";

export function TestimonialForm({
  action,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Testimonial;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  useEffect(() => { if (state.error) toast.error(state.error); }, [state.error]);

  return (
    <form action={formAction} encType="multipart/form-data" className="max-w-xl space-y-5">
      <div>
        <Label htmlFor="customer_name" required>Customer Name</Label>
        <Input id="customer_name" name="customer_name" required defaultValue={initial?.customer_name} />
      </div>
      <div>
        <Label htmlFor="rating" required>Rating (1-5)</Label>
        <Input id="rating" name="rating" type="number" min={1} max={5} required defaultValue={initial?.rating ?? 5} />
      </div>
      <div>
        <Label htmlFor="review" required>Review</Label>
        <Textarea id="review" name="review" required rows={4} defaultValue={initial?.review} />
      </div>
      <div>
        <Label htmlFor="testimonial_date">Date</Label>
        <Input id="testimonial_date" name="testimonial_date" type="date" defaultValue={initial?.testimonial_date} />
      </div>
      <div>
        <Label htmlFor="image_file">Customer Photo (optional)</Label>
        {initial?.customer_image_url && <Image src={initial.customer_image_url} alt="" width={64} height={64} className="mb-2 h-16 w-16 rounded-full object-cover" />}
        <input id="image_file" name="image_file" type="file" accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-charcoal/70 file:mr-3 file:rounded-sm file:border-0 file:bg-charcoal file:px-4 file:py-2 file:text-xs file:font-medium file:text-ivory" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="display_order">Display Order</Label>
          <Input id="display_order" name="display_order" type="number" defaultValue={initial?.display_order ?? 0} />
        </div>
        <div className="flex flex-col justify-end gap-2 pb-2.5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="is_approved" defaultChecked={initial?.is_approved ?? false} /> Approved (visible on site)</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="is_featured" defaultChecked={initial?.is_featured ?? false} /> Featured</label>
        </div>
      </div>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <Button type="submit" variant="gold" disabled={isPending}>{isPending ? "Saving…" : "Save Testimonial"}</Button>
    </form>
  );
}
