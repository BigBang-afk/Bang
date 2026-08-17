"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { formatWeight } from "@/lib/format";
import { receiveGoldFromKarigarAction } from "@/lib/actions/karigars.actions";

export function ReceiveGoldDialog({
  jobId,
  givenWeight,
  expectedWeight,
}: {
  jobId: string;
  givenWeight: string;
  expectedWeight: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [receivedWeight, setReceivedWeight] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await receiveGoldFromKarigarAction({
        jobId,
        receivedWeight: Number(receivedWeight),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `Gold received. Difference: ${formatWeight(result.data.differenceWeight)} (${result.data.reconciliationStatus.replace("_", " ")}).`,
      );
      setOpen(false);
      setReceivedWeight("");
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PackageCheck className="size-4" />
        Receive Gold
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive gold from karigar</DialogTitle>
            <DialogDescription>
              Given: {formatWeight(givenWeight)}
              {expectedWeight ? ` · Expected back: ${formatWeight(expectedWeight)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="received-weight">Received Weight (g)</Label>
            <Input
              id="received-weight"
              type="number"
              min={0}
              step="0.001"
              value={receivedWeight}
              onChange={(e) => setReceivedWeight(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={pending || receivedWeight === ""}>
              {pending ? "Recording..." : "Record Received Gold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
