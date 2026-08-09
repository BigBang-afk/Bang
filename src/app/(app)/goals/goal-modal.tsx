"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createGoalAction, updateGoalAction, deleteGoalAction, toggleGoalAchievedAction } from "@/lib/actions/goals";
import { Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";

const TYPES = [
  { value: "BALANCE", label: "Trading Balance" },
  { value: "MONTHLY_PROFIT", label: "Monthly Profit" },
  { value: "GOLD_GRAMS", label: "Gold Grams" },
  { value: "SAVINGS", label: "Savings" },
  { value: "NET_WORTH", label: "Net Worth" },
  { value: "CUSTOM", label: "Custom" },
];

interface GoalInitial {
  id: string;
  type: string;
  title: string;
  targetValue: number;
  startValue: number;
  unit: string;
  targetDate: string;
  notes: string;
}

export function AddGoalButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={16} /> New Goal
      </Button>
      <GoalEditor open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function EditGoalButton({ goal }: { goal: GoalInitial }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-hover hover:text-accent">
        <Pencil size={14} />
      </button>
      <GoalEditor open={open} onClose={() => setOpen(false)} initial={goal} />
    </>
  );
}

export function DeleteGoalButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(async () => { await deleteGoalAction(id); router.refresh(); })}
      disabled={pending}
      className="rounded-md p-1.5 text-muted hover:bg-negative-bg hover:text-negative"
    >
      <Trash2 size={14} />
    </button>
  );
}

export function ToggleAchievedButton({ id, achieved }: { id: string; achieved: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(async () => { await toggleGoalAchievedAction(id, !achieved); router.refresh(); })}
      disabled={pending}
      className={`rounded-md p-1.5 ${achieved ? "text-positive" : "text-muted hover:text-positive"}`}
      title={achieved ? "Mark as not achieved" : "Mark as achieved"}
    >
      <CheckCircle2 size={14} />
    </button>
  );
}

function GoalEditor({ open, onClose, initial }: { open: boolean; onClose: () => void; initial?: GoalInitial }) {
  const router = useRouter();
  const [type, setType] = useState(initial?.type ?? "BALANCE");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [targetValue, setTargetValue] = useState(initial ? String(initial.targetValue) : "");
  const [startValue, setStartValue] = useState(initial ? String(initial.startValue) : "0");
  const [unit, setUnit] = useState(initial?.unit ?? "USD");
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!title.trim()) return setError("Title is required.");
    if (!targetValue || Number(targetValue) <= 0) return setError("Target must be greater than zero.");
    startTransition(async () => {
      const action = initial ? updateGoalAction : createGoalAction;
      const result = await action({
        id: initial?.id,
        type,
        title,
        targetValue: Number(targetValue),
        startValue: Number(startValue) || 0,
        unit,
        targetDate: targetDate || null,
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
    <Modal open={open} onClose={onClose} title={initial ? "Edit Goal" : "New Goal"}>
      <div className="space-y-4">
        <FormField label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Reach 250g of gold" />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Goal Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Unit">
            <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option value="USD">USD</option>
              <option value="PKR">PKR</option>
              <option value="GRAMS">Grams</option>
            </Select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Target Value">
            <Input type="number" step="any" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} />
          </FormField>
          <FormField label="Start Value" hint="Used for custom goals as a baseline">
            <Input type="number" step="any" value={startValue} onChange={(e) => setStartValue(e.target.value)} />
          </FormField>
        </div>
        <FormField label="Target Date (optional)">
          <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        </FormField>
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
