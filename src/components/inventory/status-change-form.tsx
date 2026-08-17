"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { changeStockStatusAction, type ChangeStatusState } from "@/lib/actions/inventory.actions";
import { STOCK_STATUS_LABELS, STOCK_STATUS_TRANSITIONS, type StockStatusValue } from "@/types/inventory";

export function StatusChangeForm({
  itemId,
  currentStatus,
}: {
  itemId: string;
  currentStatus: StockStatusValue;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ChangeStatusState, FormData>(
    changeStockStatusAction,
    undefined,
  );
  const allowed = STOCK_STATUS_TRANSITIONS[currentStatus];

  useEffect(() => {
    if (state?.success) {
      toast.success("Stock status updated.");
      router.refresh();
    }
  }, [state, router]);

  if (allowed.length === 0) {
    return <p className="text-sm text-muted-foreground">This item&apos;s status cannot be changed further.</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={itemId} />
      <div className="space-y-1.5">
        <Label htmlFor="newStatus">Change status to</Label>
        <Select name="newStatus" required>
          <SelectTrigger id="newStatus">
            <SelectValue placeholder="Select new status" />
          </SelectTrigger>
          <SelectContent>
            {allowed.map((status) => (
              <SelectItem key={status} value={status}>
                {STOCK_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notes">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="notes" name="notes" placeholder="Reason for the change" />
      </div>
      {state?.error && <p className="text-xs text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Updating..." : "Update Status"}
      </Button>
    </form>
  );
}
