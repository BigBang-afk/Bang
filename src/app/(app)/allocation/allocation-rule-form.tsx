"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAllocationRuleAction } from "@/lib/actions/allocation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RuleValues {
  tradingCapitalPct: string;
  goldPct: string;
  savingsPct: string;
  businessPct: string;
  realEstatePct: string;
  personalPct: string;
  otherPct: string;
  otherLabel: string;
}

export function AllocationRuleForm({ initial }: { initial: RuleValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof RuleValues>(key: K, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  const total = useMemo(
    () =>
      [
        values.tradingCapitalPct,
        values.goldPct,
        values.savingsPct,
        values.businessPct,
        values.realEstatePct,
        values.personalPct,
        values.otherPct,
      ].reduce((sum, v) => sum + (Number(v) || 0), 0),
    [values]
  );
  const isValid = Math.abs(total - 100) < 0.01;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateAllocationRuleAction({
        tradingCapitalPct: Number(values.tradingCapitalPct) || 0,
        goldPct: Number(values.goldPct) || 0,
        savingsPct: Number(values.savingsPct) || 0,
        businessPct: Number(values.businessPct) || 0,
        realEstatePct: Number(values.realEstatePct) || 0,
        personalPct: Number(values.personalPct) || 0,
        otherPct: Number(values.otherPct) || 0,
        otherLabel: values.otherLabel,
      });
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  const fields: { key: keyof RuleValues; label: string }[] = [
    { key: "tradingCapitalPct", label: "Trading Capital %" },
    { key: "goldPct", label: "Physical Gold %" },
    { key: "savingsPct", label: "Savings %" },
    { key: "businessPct", label: "Business %" },
    { key: "realEstatePct", label: "Real Estate %" },
    { key: "personalPct", label: "Personal Spending %" },
    { key: "otherPct", label: "Other %" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocation Rule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {fields.map((f) => (
            <FormField key={f.key} label={f.label}>
              <Input type="number" step="any" min="0" value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
            </FormField>
          ))}
          <FormField label="Other Label">
            <Input value={values.otherLabel} onChange={(e) => set("otherLabel", e.target.value)} placeholder="e.g. Charity" />
          </FormField>
        </div>
        <div className={cn("rounded-lg border px-4 py-2 text-sm", isValid ? "border-positive/30 bg-positive-bg text-positive" : "border-negative/30 bg-negative-bg text-negative")}>
          Total: {total.toFixed(1)}% {isValid ? "✓ Balanced" : "— must equal exactly 100%"}
        </div>
        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || !isValid}>
            {pending ? "Saving…" : "Save Allocation Rule"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
