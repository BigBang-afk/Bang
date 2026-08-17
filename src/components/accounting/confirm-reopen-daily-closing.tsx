"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { confirmDailyClosingAction, reopenDailyClosingAction } from "@/lib/actions/daily-closing.actions";

export function ConfirmDailyClosingButton({ businessDate }: { businessDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmDailyClosingAction({ businessDate });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Day closed after review.");
      router.refresh();
    });
  }

  return (
    <Button onClick={handleConfirm} disabled={pending}>
      {pending ? "Closing..." : "Confirm & Close Anyway"}
    </Button>
  );
}

export function ReopenDailyClosingDialog({ businessDate }: { businessDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleReopen() {
    startTransition(async () => {
      const result = await reopenDailyClosingAction({ businessDate, reason });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Day reopened.");
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Reopen Day
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reopen {businessDate}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Only an authorized user can reopen a closed day. This is recorded with your name, a timestamp, and the
            reason below.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="reopen-reason">Reason</Label>
            <Input id="reopen-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Late supplier payment needs to be recorded" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReopen} disabled={pending || !reason.trim()}>
              {pending ? "Reopening..." : "Reopen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
