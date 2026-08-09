"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveDailyPlanAction } from "@/lib/actions/daily-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/money";
import { todayDateInputValue } from "@/lib/utils";

export function DailyPlanForm({
  initial,
}: {
  initial: {
    startingBalance: number;
    dailyTargetPct: number;
    dailyMaxLossPct: number;
    riskPerTradePct: number;
    maxTrades: number;
    maxConsecutiveLosses: number;
    session1Target: number | null;
    session2Target: number | null;
    notes: string;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    startingBalance: String(initial.startingBalance),
    dailyTargetPct: String(initial.dailyTargetPct),
    dailyMaxLossPct: String(initial.dailyMaxLossPct),
    riskPerTradePct: String(initial.riskPerTradePct),
    maxTrades: String(initial.maxTrades),
    maxConsecutiveLosses: String(initial.maxConsecutiveLosses),
    session1Target: initial.session1Target !== null ? String(initial.session1Target) : "",
    session2Target: initial.session2Target !== null ? String(initial.session2Target) : "",
    notes: initial.notes,
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof values>(key: K, v: (typeof values)[K]) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  const balance = Number(values.startingBalance) || 0;
  const targetUsd = balance * ((Number(values.dailyTargetPct) || 0) / 100);
  const lossUsd = balance * ((Number(values.dailyMaxLossPct) || 0) / 100);
  const riskUsd = balance * ((Number(values.riskPerTradePct) || 0) / 100);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveDailyPlanAction({
        date: todayDateInputValue(),
        startingBalance: Number(values.startingBalance),
        dailyTargetPct: Number(values.dailyTargetPct),
        dailyMaxLossPct: Number(values.dailyMaxLossPct),
        riskPerTradePct: Number(values.riskPerTradePct),
        maxTrades: Number(values.maxTrades),
        maxConsecutiveLosses: Number(values.maxConsecutiveLosses),
        session1Target: values.session1Target === "" ? null : Number(values.session1Target),
        session2Target: values.session2Target === "" ? null : Number(values.session2Target),
        notes: values.notes,
      });
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Trading Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <FormField label="Starting Balance (USD)">
            <Input type="number" step="any" value={values.startingBalance} onChange={(e) => set("startingBalance", e.target.value)} />
          </FormField>
          <FormField label="Daily Target %">
            <Input type="number" step="any" value={values.dailyTargetPct} onChange={(e) => set("dailyTargetPct", e.target.value)} />
          </FormField>
          <FormField label="Daily Max Loss %">
            <Input type="number" step="any" value={values.dailyMaxLossPct} onChange={(e) => set("dailyMaxLossPct", e.target.value)} />
          </FormField>
          <FormField label="Risk Per Trade %">
            <Input type="number" step="any" value={values.riskPerTradePct} onChange={(e) => set("riskPerTradePct", e.target.value)} />
          </FormField>
          <FormField label="Maximum Number of Trades">
            <Input type="number" min="1" value={values.maxTrades} onChange={(e) => set("maxTrades", e.target.value)} />
          </FormField>
          <FormField label="Maximum Consecutive Losses">
            <Input type="number" min="1" value={values.maxConsecutiveLosses} onChange={(e) => set("maxConsecutiveLosses", e.target.value)} />
          </FormField>
          <FormField label="Session 1 Target (USD)">
            <Input type="number" step="any" value={values.session1Target} onChange={(e) => set("session1Target", e.target.value)} />
          </FormField>
          <FormField label="Session 2 Target (USD)">
            <Input type="number" step="any" value={values.session2Target} onChange={(e) => set("session2Target", e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </FormField>

        <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-surface-2 p-4 text-center">
          <div>
            <p className="text-[10px] text-muted">Daily Target</p>
            <p className="text-sm font-semibold text-positive">{formatUsd(targetUsd)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Daily Stop Loss</p>
            <p className="text-sm font-semibold text-negative">{formatUsd(lossUsd)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">Risk / Trade</p>
            <p className="text-sm font-semibold text-accent">{formatUsd(riskUsd)}</p>
          </div>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save Today's Plan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
