"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Copy, Trash2 } from "lucide-react";
import { deleteTradeAction, duplicateTradeAction } from "@/lib/actions/trades";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function TradeRowActions({ id, symbol }: { id: string; symbol: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Link
        href={`/trades/${id}/edit`}
        className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-accent"
        title="Edit"
      >
        <Pencil size={15} />
      </Link>
      <button
        title="Duplicate"
        onClick={() =>
          startTransition(async () => {
            await duplicateTradeAction(id);
            router.refresh();
          })
        }
        className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-accent"
        disabled={pending}
      >
        <Copy size={15} />
      </button>
      <button
        title="Delete"
        onClick={() => setConfirmOpen(true)}
        className="rounded-md p-1.5 text-muted hover:bg-negative-bg hover:text-negative"
      >
        <Trash2 size={15} />
      </button>

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete trade?">
        <p className="text-sm text-muted">
          This will permanently remove the {symbol} trade and its effect on your account balance. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="negative"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteTradeAction(id);
                setConfirmOpen(false);
                router.refresh();
              })
            }
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
