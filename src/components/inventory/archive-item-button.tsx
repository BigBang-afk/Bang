"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { archiveInventoryItemAction } from "@/lib/actions/inventory.actions";

export function ArchiveItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveInventoryItemAction(itemId);
      if (result.ok) {
        toast.success("Stock item archived.");
        setOpen(false);
        router.push("/inventory");
      } else {
        toast.error(result.error ?? "Failed to archive item.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Archive className="size-4" />
        Archive
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive this stock item?</DialogTitle>
          <DialogDescription>
            The barcode, cost history, and audit trail are preserved forever and the barcode is
            never reused. This only removes the item from active inventory views.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleArchive} disabled={pending}>
            {pending ? "Archiving..." : "Archive item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
