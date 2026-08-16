"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { requestReturnAction } from "@/lib/actions/sales.actions";

export function RequestReturnButton({
  saleItemId,
  productName,
}: {
  saleItemId: string;
  productName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await requestReturnAction({ saleItemId, reason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Return requested.");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <RotateCcw className="size-4" />
        Return
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a return</DialogTitle>
            <DialogDescription>
              {productName} — this only requests the return. Inventory is not adjusted until an
              authorized user approves it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="return-reason">Reason</Label>
            <Input id="return-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || !reason.trim()}>
              {pending ? "Submitting..." : "Submit return request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
