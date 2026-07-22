"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/input";
import { updatePagesContentAction, type ActionState } from "./actions";
import type { WebsiteSettings } from "@/types/database";

export function PagesForm({ settings }: { settings: WebsiteSettings }) {
  const [state, formAction, isPending] = useActionState(updatePagesContentAction, {} as ActionState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state.error, state.success]);

  return (
    <form action={formAction} className="space-y-8">
      <div>
        <Label htmlFor="about_content" required>About Us Page Content</Label>
        <Textarea id="about_content" name="about_content" required rows={8} defaultValue={settings.about_content} />
        <p className="mt-1 text-xs text-charcoal/50">Only include facts you know to be true — founding year, awards, or history should not be invented.</p>
      </div>
      <div>
        <Label htmlFor="privacy_policy" required>Privacy Policy</Label>
        <Textarea id="privacy_policy" name="privacy_policy" required rows={10} defaultValue={settings.privacy_policy} />
      </div>
      <div>
        <Label htmlFor="terms_conditions" required>Terms &amp; Conditions</Label>
        <Textarea id="terms_conditions" name="terms_conditions" required rows={10} defaultValue={settings.terms_conditions} />
      </div>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <Button type="submit" variant="gold" disabled={isPending}>{isPending ? "Saving…" : "Save Pages"}</Button>
    </form>
  );
}
