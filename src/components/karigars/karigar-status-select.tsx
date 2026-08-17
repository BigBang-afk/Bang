"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { KARIGAR_STATUSES, KARIGAR_STATUS_LABELS, type KarigarStatusValue } from "@/types/karigars";
import { changeKarigarStatusAction } from "@/lib/actions/karigars.actions";

export function KarigarStatusSelect({ karigarId, status }: { karigarId: string; status: KarigarStatusValue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await changeKarigarStatusAction({ id: karigarId, status: value });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Status updated.");
      router.refresh();
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {KARIGAR_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {KARIGAR_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
