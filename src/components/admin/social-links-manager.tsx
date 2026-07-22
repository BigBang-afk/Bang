"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { addSocialLinkAction, deleteSocialLinkAction } from "@/app/admin/(protected)/settings/actions";
import type { SocialLink } from "@/types/database";

export function SocialLinksManager({ links }: { links: SocialLink[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.id} className="flex items-center justify-between rounded-sm border border-charcoal/10 px-3 py-2 text-sm">
            <span className="capitalize">{link.platform}</span>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-charcoal/50 underline">{link.url}</a>
            <button
              type="button" aria-label="Remove"
              onClick={() => startTransition(async () => { await deleteSocialLinkAction(link.id); toast.success("Removed"); })}
              disabled={isPending}
              className="rounded-sm p-1 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
        {links.length === 0 && <p className="text-xs text-charcoal/40">No social links added yet.</p>}
      </ul>

      <form
        action={(formData) => startTransition(async () => {
          await addSocialLinkAction(formData);
          toast.success("Social link added");
        })}
        className="flex flex-wrap items-end gap-2"
      >
        <Select name="platform" defaultValue="facebook" className="w-36">
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="twitter">Twitter / X</option>
          <option value="youtube">YouTube</option>
        </Select>
        <Input name="url" type="url" placeholder="https://facebook.com/…" required className="flex-1 min-w-[200px]" />
        <Button type="submit" size="sm" disabled={isPending}>Add</Button>
      </form>
    </div>
  );
}
