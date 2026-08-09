"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDepositAction } from "@/lib/actions/deposits";
import { Card, CardContent } from "@/components/ui/card";
import { Input, FormField, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { todayDateInputValue } from "@/lib/utils";

export function DepositForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return setError("Deposit amount must be greater than zero.");
    startTransition(async () => {
      const result = await createDepositAction({ date, amountUsd: amountNum, notes });
      if (result?.error) setError(result.error);
      else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <FormField label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Deposit Amount (USD)">
          <Input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </FormField>
        <FormField label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>
        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save Deposit"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
