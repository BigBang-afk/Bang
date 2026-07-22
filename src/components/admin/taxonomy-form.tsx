"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/actions/taxonomy";

export interface TaxonomyFormValues {
  name?: string;
  slug?: string;
  code?: string;
  description?: string | null;
  image_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  display_order?: number;
  is_active?: boolean;
}

export function TaxonomyForm({
  action,
  initial,
  label,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: TaxonomyFormValues;
  label: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state.error]);

  return (
    <form action={formAction} encType="multipart/form-data" className="max-w-2xl space-y-5">
      <div>
        <Label htmlFor="name" required>{label} Name</Label>
        <Input
          id="name" name="name" required value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </div>

      <div>
        <Label htmlFor="slug" required>URL Slug</Label>
        <Input id="slug" name="slug" required value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }} />
      </div>

      {label === "Category" && (
        <div>
          <Label htmlFor="code" required>
            Product Code Prefix
          </Label>
          <Input id="code" name="code" required maxLength={6} defaultValue={initial?.code ?? ""} placeholder="e.g. RNG" className="uppercase" />
          <p className="mt-1 text-xs text-charcoal/50">Used to auto-generate product codes, e.g. ZJ-{initial?.code || "RNG"}-0001.</p>
        </div>
      )}

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </div>

      <div>
        <Label htmlFor="image_file">{label} Image</Label>
        {initial?.image_url && (
          <Image src={initial.image_url} alt="" width={96} height={96} className="mb-2 h-24 w-24 rounded-sm object-cover" />
        )}
        <input id="image_file" name="image_file" type="file" accept="image/jpeg,image/png,image/webp"
          className="block w-full text-sm text-charcoal/70 file:mr-3 file:rounded-sm file:border-0 file:bg-charcoal file:px-4 file:py-2 file:text-xs file:font-medium file:text-ivory" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="display_order">Display Order</Label>
          <Input id="display_order" name="display_order" type="number" defaultValue={initial?.display_order ?? 0} />
        </div>
        <div className="flex items-end pb-2.5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_active" defaultChecked={initial?.is_active ?? true} /> Active
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="seo_title">SEO Title</Label>
        <Input id="seo_title" name="seo_title" defaultValue={initial?.seo_title ?? ""} maxLength={70} />
      </div>
      <div>
        <Label htmlFor="seo_description">SEO Description</Label>
        <Textarea id="seo_description" name="seo_description" defaultValue={initial?.seo_description ?? ""} maxLength={160} />
      </div>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <Button type="submit" variant="gold" disabled={isPending}>
        {isPending ? "Saving…" : `Save ${label}`}
      </Button>
    </form>
  );
}
