"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWithdrawalAction } from "@/lib/actions/withdrawals";
import { Card, CardContent } from "@/components/ui/card";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUsd, formatPkr } from "@/lib/money";
import { todayDateInputValue } from "@/lib/utils";

const DESTINATIONS = [
  "CASH",
  "BANK",
  "GOLD",
  "CRYPTO",
  "BUSINESS",
  "SAVINGS",
  "REAL_ESTATE",
  "PERSONAL_EXPENSE",
  "OTHER",
];

export function WithdrawalForm({ usdToPkrRate, balance }: { usdToPkrRate: number; balance: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayDateInputValue());
  const [destination, setDestination] = useState("BANK");
  const [purpose, setPurpose] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const amountNum = Number(amount) || 0;
  const pkrPreview = useMemo(() => amountNum * usdToPkrRate, [amountNum, usdToPkrRate]);

  function submit() {
    setError(null);
    if (amountNum <= 0) return setError("Withdrawal amount must be greater than zero.");
    startTransition(async () => {
      const result = await createWithdrawalAction({ date, amountUsd: amountNum, destination, purpose, notes });
      if (result?.error) setError(result.error);
      else {
        router.push("/withdrawals");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
          Current trading balance: <span className="font-semibold text-foreground">{formatUsd(balance)}</span>
        </div>
        <FormField label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormField>
        <FormField label="Withdrawal Amount (USD)">
          <Input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <FormField label="PKR Equivalent" hint="Calculated automatically at the current rate">
          <Input value={formatPkr(pkrPreview)} disabled />
        </FormField>
        <FormField label="Destination">
          <Select value={destination} onChange={(e) => setDestination(e.target.value)}>
            {DESTINATIONS.map((d) => (
              <option key={d} value={d}>
                {d.replace("_", " ")}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Purpose">
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Rent, savings top-up…" />
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
            {pending ? "Saving…" : "Save Withdrawal"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
