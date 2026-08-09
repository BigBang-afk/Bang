"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAssetAction, updateAssetAction, deleteAssetAction } from "@/lib/actions/assets";
import { Plus, Pencil, Trash2 } from "lucide-react";

const CATEGORIES = ["CASH", "BANK", "CRYPTO", "BUSINESS", "REAL_ESTATE", "OTHER"];

interface AssetInitial {
  id: string;
  category: string;
  name: string;
  valueUsd: number;
  valuePkr: number;
  notes: string;
}

export function AddAssetButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> Add Asset
      </Button>
      <AssetEditor open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function EditAssetButton({ asset }: { asset: AssetInitial }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-accent">
        <Pencil size={14} />
      </button>
      <AssetEditor open={open} onClose={() => setOpen(false)} initial={asset} />
    </>
  );
}

export function DeleteAssetButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await deleteAssetAction(id);
          router.refresh();
        })
      }
      disabled={pending}
      className="rounded-md p-1.5 text-muted hover:bg-negative-bg hover:text-negative"
    >
      <Trash2 size={14} />
    </button>
  );
}

function AssetEditor({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: AssetInitial }) {
  const router = useRouter();
  const [category, setCategory] = useState(initial?.category ?? "CASH");
  const [name, setName] = useState(initial?.name ?? "");
  const [valueUsd, setValueUsd] = useState(initial ? String(initial.valueUsd) : "");
  const [valuePkr, setValuePkr] = useState(initial ? String(initial.valuePkr) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!name.trim()) return setError("Name is required.");
    startTransition(async () => {
      const action = initial ? updateAssetAction : createAssetAction;
      const result = await action({
        id: initial?.id,
        category,
        name,
        valueUsd: Number(valueUsd) || 0,
        valuePkr: Number(valuePkr) || 0,
        notes,
      });
      if (result?.error) setError(result.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={initial ? "Edit Asset" : "Add Asset"}>
      <div className="space-y-4">
        <FormField label="Category">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Meezan Savings Account" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Value (USD)">
            <Input type="number" step="any" min="0" value={valueUsd} onChange={(e) => setValueUsd(e.target.value)} />
          </FormField>
          <FormField label="Value (PKR)">
            <Input type="number" step="any" min="0" value={valuePkr} onChange={(e) => setValuePkr(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>
        {error && <p className="text-xs text-negative">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
