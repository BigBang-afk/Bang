"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createAllocationTransferAction, deleteAllocationTransferAction } from "@/lib/actions/allocation";
import { todayDateInputValue } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["TRADING_CAPITAL", "GOLD", "SAVINGS", "BUSINESS", "REAL_ESTATE", "PERSONAL", "OTHER"];

export function AddTransferButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayDateInputValue());
  const [category, setCategory] = useState("SAVINGS");
  const [amount, setAmount] = useState("");
  const [goldGrams, setGoldGrams] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return setError("Amount must be greater than zero.");
    startTransition(async () => {
      const result = await createAllocationTransferAction({
        date,
        category,
        amountUsd: amountNum,
        goldGrams: goldGrams === "" ? null : Number(goldGrams),
        notes,
      });
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setAmount("");
        setNotes("");
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> Log Actual Transfer
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Log Actual Transfer">
        <div className="space-y-4">
          <FormField label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
          <FormField label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount (USD)">
            <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </FormField>
          {category === "GOLD" && (
            <FormField label="Gold Grams (optional override)" hint="Leave blank to auto-calculate from current gold price">
              <Input type="number" step="any" value={goldGrams} onChange={(e) => setGoldGrams(e.target.value)} />
            </FormField>
          )}
          <FormField label="Notes">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </FormField>
          {error && <p className="text-xs text-negative">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Saving…" : "Save Transfer"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export function DeleteTransferButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await deleteAllocationTransferAction(id);
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
