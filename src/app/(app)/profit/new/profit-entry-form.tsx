"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProfitEntryAction } from "@/lib/actions/profit-entry";
import { Card, CardContent } from "@/components/ui/card";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { previewUsdToPkrAndGold, formatUsd, formatPkr, formatGrams } from "@/lib/money";
import { todayDateInputValue } from "@/lib/utils";

export function ProfitEntryForm({ usdToPkrRate, goldPricePerGramPkr }: { usdToPkrRate: number; goldPricePerGramPkr: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [source, setSource] = useState("TRADING");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const amountNum = Number(amount) || 0;
  const preview = useMemo(
    () => previewUsdToPkrAndGold(amountNum, usdToPkrRate, goldPricePerGramPkr),
    [amountNum, usdToPkrRate, goldPricePerGramPkr]
  );

  function submit() {
    setError(null);
    if (amount === "" || amountNum === 0) return setError("Enter a non-zero profit or loss amount.");
    startTransition(async () => {
      const result = await createProfitEntryAction({ date, amountUsd: amountNum, source, notes });
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
        <FormField label="Profit / Loss (USD)">
          <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" autoFocus />
        </FormField>
        <FormField label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Source">
          <Select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="TRADING">Trading</option>
            <option value="OTHER">Other</option>
          </Select>
        </FormField>
        <FormField label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </FormField>

        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted">USD</p>
              <p className={`text-sm font-semibold ${amountNum >= 0 ? "text-positive" : "text-negative"}`}>
                {formatUsd(amountNum, { showSign: true })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted">PKR</p>
              <p className={`text-sm font-semibold ${amountNum >= 0 ? "text-positive" : "text-negative"}`}>
                {formatPkr(preview.pkr, { showSign: true })}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted">{amountNum >= 0 ? "24K Gold Equivalent" : "Value Equivalent"}</p>
              <p className="text-sm font-semibold text-gold">{formatGrams(Math.abs(preview.grams))}</p>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
