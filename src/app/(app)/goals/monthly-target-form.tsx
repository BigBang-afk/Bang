"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMonthlyTargetAction } from "@/lib/actions/goals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MonthlyTargetForm({
  month,
  year,
  initial,
}: {
  month: number;
  year: number;
  initial: {
    startingCapital: number;
    targetProfit: number;
    maxDrawdownPct: number;
    withdrawalGoal: number | null;
    goldPurchaseGoalGrams: number | null;
    savingsGoal: number | null;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    startingCapital: String(initial.startingCapital),
    targetProfit: String(initial.targetProfit),
    maxDrawdownPct: String(initial.maxDrawdownPct),
    withdrawalGoal: initial.withdrawalGoal !== null ? String(initial.withdrawalGoal) : "",
    goldPurchaseGoalGrams: initial.goldPurchaseGoalGrams !== null ? String(initial.goldPurchaseGoalGrams) : "",
    savingsGoal: initial.savingsGoal !== null ? String(initial.savingsGoal) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof values>(key: K, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveMonthlyTargetAction({
        month,
        year,
        startingCapital: Number(values.startingCapital) || 0,
        targetProfit: Number(values.targetProfit) || 0,
        maxDrawdownPct: Number(values.maxDrawdownPct) || 0,
        withdrawalGoal: values.withdrawalGoal === "" ? null : Number(values.withdrawalGoal),
        goldPurchaseGoalGrams: values.goldPurchaseGoalGrams === "" ? null : Number(values.goldPurchaseGoalGrams),
        savingsGoal: values.savingsGoal === "" ? null : Number(values.savingsGoal),
      });
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Monthly Targets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <FormField label="Starting Capital (USD)">
            <Input type="number" step="any" value={values.startingCapital} onChange={(e) => set("startingCapital", e.target.value)} />
          </FormField>
          <FormField label="Target Profit (USD)">
            <Input type="number" step="any" value={values.targetProfit} onChange={(e) => set("targetProfit", e.target.value)} />
          </FormField>
          <FormField label="Max Monthly Drawdown %">
            <Input type="number" step="any" value={values.maxDrawdownPct} onChange={(e) => set("maxDrawdownPct", e.target.value)} />
          </FormField>
          <FormField label="Withdrawal Goal (USD)">
            <Input type="number" step="any" value={values.withdrawalGoal} onChange={(e) => set("withdrawalGoal", e.target.value)} />
          </FormField>
          <FormField label="Gold Purchase Goal (g)">
            <Input type="number" step="any" value={values.goldPurchaseGoalGrams} onChange={(e) => set("goldPurchaseGoalGrams", e.target.value)} />
          </FormField>
          <FormField label="Savings Goal (USD)">
            <Input type="number" step="any" value={values.savingsGoal} onChange={(e) => set("savingsGoal", e.target.value)} />
          </FormField>
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save Monthly Target"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
