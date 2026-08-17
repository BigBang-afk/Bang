"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { ActionResult } from "@/lib/actions/action-result";

/**
 * Shared void dialog for Expense and Income — always requires a reason,
 * never a silent delete. `action` must be the bare Server Action reference
 * (not a closure wrapping it) so Next.js can serialize it across the
 * Server->Client boundary; the {[idField]: id, reason} input is built
 * client-side instead of being passed in pre-built.
 */
export function VoidFinancialEntryDialog<IdField extends string>({
  entryNumber,
  entryId,
  idField,
  action,
}: {
  entryNumber: string;
  entryId: string;
  idField: IdField;
  action: (input: Record<IdField, string> & { reason: string }) => Promise<ActionResult<{ id: string }>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      const result = await action({ [idField]: entryId, reason } as Record<IdField, string> & { reason: string });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${entryNumber} voided.`);
      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="ghost" size="icon" title="Void" onClick={() => setOpen(true)}>
        <Ban className="size-4 text-danger" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void {entryNumber}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This never deletes the record — it marks it VOIDED, reverses its cash impact with an explicit adjustment,
            and excludes it from every report from now on. To record the correct amount, add a new entry afterward.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="void-reason">Reason</Label>
            <Input id="void-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Duplicate entry, wrong amount" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleSubmit} disabled={pending || !reason.trim()}>
              {pending ? "Voiding..." : "Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
