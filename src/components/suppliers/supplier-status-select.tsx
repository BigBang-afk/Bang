"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { SUPPLIER_STATUSES, SUPPLIER_STATUS_LABELS, type SupplierStatusValue } from "@/types/suppliers";
import { changeSupplierStatusAction } from "@/lib/actions/suppliers.actions";

export function SupplierStatusSelect({ supplierId, status }: { supplierId: string; status: SupplierStatusValue }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleChange(value: string) {
    startTransition(async () => {
      const result = await changeSupplierStatusAction({ id: supplierId, status: value });
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
        {SUPPLIER_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {SUPPLIER_STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
