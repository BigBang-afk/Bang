"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input, FormField, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createStrategyAction, updateStrategyAction, deleteStrategyAction } from "@/lib/actions/strategies";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function AddStrategyButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> New Strategy
      </Button>
      <StrategyEditor open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function EditStrategyButton({ id, name, description }: { id: string; name: string; description: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-accent">
        <Pencil size={14} />
      </button>
      <StrategyEditor open={open} onClose={() => setOpen(false)} initial={{ id, name, description }} />
    </>
  );
}

export function DeleteStrategyButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button onClick={() => setConfirmOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-negative-bg hover:text-negative">
        <Trash2 size={14} />
      </button>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Delete strategy?">
        <p className="text-sm text-muted">This cannot be undone.</p>
        {error && <p className="mt-2 text-xs text-negative">{error}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="negative"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteStrategyAction(id);
                if (result?.error) setError(result.error);
                else {
                  setConfirmOpen(false);
                  router.refresh();
                }
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

function StrategyEditor({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: { id: string; name: string; description: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const action = initial ? updateStrategyAction : createStrategyAction;
      const result = await action({ id: initial?.id, name, description });
      if (result?.error) setError(result.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Strategy" : "New Strategy"}>
      <div className="space-y-4">
        <FormField label="Strategy Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Price Action, Order Block…" />
        </FormField>
        <FormField label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </FormField>
        {error && <p className="text-xs text-negative">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
