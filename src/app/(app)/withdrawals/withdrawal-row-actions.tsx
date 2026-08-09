"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteWithdrawalAction } from "@/lib/actions/withdrawals";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function WithdrawalRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button onClick={() => setConfirmOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-negative-bg hover:text-negative">
        <Trash2 size={15} />
      </button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete withdrawal?">
        <p className="text-sm text-muted">This will restore the amount to your trading balance. This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="negative"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteWithdrawalAction(id);
                setConfirmOpen(false);
                router.refresh();
              })
            }
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
