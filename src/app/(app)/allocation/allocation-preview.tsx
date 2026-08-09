"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input, FormField } from "@/components/ui/input";
import { formatUsd, formatPkr, formatGrams } from "@/lib/money";

interface Rule {
  tradingCapitalPct: number;
  goldPct: number;
  savingsPct: number;
  businessPct: number;
  realEstatePct: number;
  personalPct: number;
  otherPct: number;
  otherLabel: string | null;
}

export function AllocationPreview({
  rule,
  defaultAmount,
  usdToPkrRate,
  goldPricePerGramPkr,
}: {
  rule: Rule;
  defaultAmount: number;
  usdToPkrRate: number;
  goldPricePerGramPkr: number;
}) {
  const [amount, setAmount] = useState(String(Math.max(0, defaultAmount).toFixed(2)));
  const amountNum = Number(amount) || 0;

  const rows = useMemo(() => {
    const items = [
      { label: "Trading Capital", pct: rule.tradingCapitalPct },
      { label: "Physical Gold", pct: rule.goldPct },
      { label: "Savings", pct: rule.savingsPct },
      { label: "Business", pct: rule.businessPct },
      { label: "Real Estate", pct: rule.realEstatePct },
      { label: "Personal Spending", pct: rule.personalPct },
      { label: rule.otherLabel || "Other", pct: rule.otherPct },
    ];
    return items
      .filter((i) => i.pct > 0)
      .map((i) => {
        const usd = amountNum * (i.pct / 100);
        const pkr = usd * usdToPkrRate;
        return { ...i, usd, pkr, grams: goldPricePerGramPkr > 0 ? pkr / goldPricePerGramPkr : 0 };
      });
  }, [amountNum, rule, usdToPkrRate, goldPricePerGramPkr]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Recommended / Planned Allocation</CardTitle>
          <CardDescription>
            A preview only — nothing here is counted as an actual asset until you log a confirmed transfer below.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField label="Profit Amount to Allocate (USD)">
          <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </FormField>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2 text-sm">
              <span className="text-muted">
                {r.label} <span className="text-muted-2">({r.pct}%)</span>
              </span>
              <span className="text-right">
                <span className="font-medium">{formatUsd(r.usd)}</span>
                <span className="ml-2 text-xs text-muted">{formatPkr(r.pkr)}</span>
                {r.label === "Physical Gold" && <span className="ml-2 text-xs text-gold">{formatGrams(r.grams)}</span>}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
