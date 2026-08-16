"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { approveReturnAction } from "@/lib/actions/sales.actions";

export function ApproveReturnButton({ returnId, productName }: { returnId: string; productName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveReturnAction({ returnId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Return approved — inventory moved to Returned.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <CheckCircle2 className="size-4" />
        Approve
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this return?</DialogTitle>
            <DialogDescription>
              {productName} will move to Returned status and the sale will be marked accordingly.
              This cannot be undone from here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={pending}>
              {pending ? "Approving..." : "Approve return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
