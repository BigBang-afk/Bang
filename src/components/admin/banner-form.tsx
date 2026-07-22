"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Banner } from "@/types/database";
import type { ActionState } from "@/app/admin/(protected)/banners/actions";

export function BannerForm({
  action,
  initial,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: Banner;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  useEffect(() => { if (state.error) toast.error(state.error); }, [state.error]);

  return (
    <form action={formAction} encType="multipart/form-data" className="max-w-2xl space-y-5">
      <div>
        <Label htmlFor="title" required>Title</Label>
        <Input id="title" name="title" required defaultValue={initial?.title} />
      </div>
      <div>
        <Label htmlFor="subtitle">Subtitle</Label>
        <Textarea id="subtitle" name="subtitle" defaultValue={initial?.subtitle ?? ""} rows={2} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="image_file" required={!initial}>Desktop Image</Label>
          {initial?.image_url && <Image src={initial.image_url} alt="" width={120} height={60} className="mb-2 h-16 w-32 rounded-sm object-cover" />}
          <input id="image_file" name="image_file" type="file" accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-charcoal/70 file:mr-3 file:rounded-sm file:border-0 file:bg-charcoal file:px-4 file:py-2 file:text-xs file:font-medium file:text-ivory" />
        </div>
        <div>
          <Label htmlFor="mobile_image_file">Mobile Image (optional)</Label>
          {initial?.mobile_image_url && <Image src={initial.mobile_image_url} alt="" width={60} height={90} className="mb-2 h-16 w-10 rounded-sm object-cover" />}
          <input id="mobile_image_file" name="mobile_image_file" type="file" accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-charcoal/70 file:mr-3 file:rounded-sm file:border-0 file:bg-charcoal file:px-4 file:py-2 file:text-xs file:font-medium file:text-ivory" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="button_text">Button Text</Label>
          <Input id="button_text" name="button_text" defaultValue={initial?.button_text ?? ""} />
        </div>
        <div>
          <Label htmlFor="button_url">Button URL</Label>
          <Input id="button_url" name="button_url" defaultValue={initial?.button_url ?? ""} placeholder="/collections/bridal-jewelry" />
        </div>
        <div>
          <Label htmlFor="start_date">Start Date</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={initial?.start_date ?? ""} />
        </div>
        <div>
          <Label htmlFor="end_date">End Date</Label>
          <Input id="end_date" name="end_date" type="date" defaultValue={initial?.end_date ?? ""} />
        </div>
        <div>
          <Label htmlFor="display_order">Display Order</Label>
          <Input id="display_order" name="display_order" type="number" defaultValue={initial?.display_order ?? 0} />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} /> Active</label>
        </div>
      </div>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <Button type="submit" variant="gold" disabled={isPending}>{isPending ? "Saving…" : "Save Banner"}</Button>
    </form>
  );
}
