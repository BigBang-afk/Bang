"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { deleteGoldTransactionAction } from "@/lib/actions/gold";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function GoldRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <Link href={`/gold/${id}/edit`} className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-accent">
        <Pencil size={14} />
      </Link>
      <button onClick={() => setConfirmOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-negative-bg hover:text-negative">
        <Trash2 size={14} />
      </button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete gold transaction?">
        <p className="text-sm text-muted">This cannot be undone.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="negative"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteGoldTransactionAction(id);
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
