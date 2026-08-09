"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, updateExpenseAction } from "@/lib/actions/expenses";
import { Card, CardContent } from "@/components/ui/card";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";
import { todayDateInputValue } from "@/lib/utils";

const CATEGORIES = ["FOOD", "SHOPPING", "BILLS", "TRAVEL", "BUSINESS", "FAMILY", "ENTERTAINMENT", "TRADING_EXPENSE", "OTHER"];

export interface ExpenseFormValues {
  id?: string;
  date: string;
  category: string;
  description: string;
  amountPkr: string;
  paymentMethod: string;
  notes: string;
}

export function ExpenseForm({ initial, usdToPkrRate }: { initial?: Partial<ExpenseFormValues>; usdToPkrRate: number }) {
  const router = useRouter();
  const [values, setValues] = useState<ExpenseFormValues>({
    date: todayDateInputValue(),
    category: "FOOD",
    description: "",
    amountPkr: "",
    paymentMethod: "",
    notes: "",
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(values.id);

  function set<K extends keyof ExpenseFormValues>(key: K, v: ExpenseFormValues[K]) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  const usdPreview = usdToPkrRate > 0 ? (Number(values.amountPkr) || 0) / usdToPkrRate : 0;

  function submit() {
    setError(null);
    if (!values.amountPkr || Number(values.amountPkr) <= 0) return setError("Amount must be greater than zero.");
    const payload = { ...values, amountPkr: Number(values.amountPkr) };
    startTransition(async () => {
      const result = isEdit ? await updateExpenseAction(payload) : await createExpenseAction(payload);
      if (result?.error) setError(result.error);
      else {
        router.push("/expenses");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Date">
            <Input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
          </FormField>
          <FormField label="Category">
            <Select value={values.category} onChange={(e) => set("category", e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("_", " ")}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
        <FormField label="Description">
          <Input value={values.description} onChange={(e) => set("description", e.target.value)} />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Amount (PKR)">
            <Input type="number" step="any" min="0" value={values.amountPkr} onChange={(e) => set("amountPkr", e.target.value)} />
          </FormField>
          <FormField label="Payment Method">
            <Input value={values.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)} placeholder="Cash, Card, Bank Transfer…" />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </FormField>

        <div className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          USD Equivalent: <span className="font-semibold text-foreground">{formatUsd(usdPreview)}</span>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Save Expense"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
