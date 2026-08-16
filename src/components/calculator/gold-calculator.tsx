"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatWeight, formatRatePerGram } from "@/lib/format";
import {
  GOLD_PURITIES,
  PURITY_LABELS,
  type GoldPurity,
  type WastageType,
  type SimpleGoldRate,
} from "@/types/gold";
import {
  calculateGoldValueAction,
  type CalculateGoldValueState,
} from "@/lib/actions/gold-calculation.actions";

export function GoldCalculator({ rates }: { rates: SimpleGoldRate[] }) {
  const rateByPurity = useMemo(
    () => new Map(rates.map((rate) => [rate.purity, rate.ratePerGram])),
    [rates],
  );

  const [purity, setPurity] = useState<GoldPurity>(
    rateByPurity.has("K22") ? "K22" : (rates[0]?.purity ?? "K22"),
  );
  const [goldRate, setGoldRate] = useState(rateByPurity.get(purity) ?? "");
  const [netWeight, setNetWeight] = useState("10");
  const [wastageType, setWastageType] = useState<WastageType>("PERCENTAGE");
  const [wastagePercent, setWastagePercent] = useState("5");
  const [wastageGrams, setWastageGrams] = useState("0.5");

  const [state, setState] = useState<CalculateGoldValueState>();
  const [pending, startTransition] = useTransition();

  function handlePurityChange(value: GoldPurity) {
    setPurity(value);
    const rate = rateByPurity.get(value);
    if (rate) setGoldRate(rate);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        const result = await calculateGoldValueAction({
          netWeight,
          goldRate,
          wastageType,
          wastagePercent: wastageType === "PERCENTAGE" ? wastagePercent : undefined,
          wastageGrams: wastageType === "FIXED_GRAMS" ? wastageGrams : undefined,
        });
        setState(result);
      });
    }, 200);
    return () => clearTimeout(timer);
  }, [netWeight, goldRate, wastageType, wastagePercent, wastageGrams]);

  const result = state?.result;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gold Value Calculator</CardTitle>
        <CardDescription>
          Server-verified weight and pricing engine — the same engine used across the business.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Purity</Label>
              <Select value={purity} onValueChange={(value) => handlePurityChange(value as GoldPurity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOLD_PURITIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {PURITY_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="calc-gold-rate">Gold Rate (per gram)</Label>
              <Input
                id="calc-gold-rate"
                type="number"
                inputMode="decimal"
                step="0.01"
                value={goldRate}
                onChange={(event) => setGoldRate(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="calc-net-weight">Net Weight (grams)</Label>
              <Input
                id="calc-net-weight"
                type="number"
                inputMode="decimal"
                step="0.001"
                value={netWeight}
                onChange={(event) => setNetWeight(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Wastage Type</Label>
              <Tabs value={wastageType} onValueChange={(value) => setWastageType(value as WastageType)}>
                <TabsList className="w-full">
                  <TabsTrigger value="PERCENTAGE" className="flex-1">
                    Percentage
                  </TabsTrigger>
                  <TabsTrigger value="FIXED_GRAMS" className="flex-1">
                    Fixed Grams
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {wastageType === "PERCENTAGE" ? (
              <div className="space-y-1.5">
                <Label htmlFor="calc-wastage-percent">Wastage %</Label>
                <Input
                  id="calc-wastage-percent"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={wastagePercent}
                  onChange={(event) => setWastagePercent(event.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="calc-wastage-grams">Wastage (grams)</Label>
                <Input
                  id="calc-wastage-grams"
                  type="number"
                  inputMode="decimal"
                  step="0.001"
                  value={wastageGrams}
                  onChange={(event) => setWastageGrams(event.target.value)}
                />
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-surface-elevated p-5">
            {state?.error ? (
              <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
                {state.error}
              </p>
            ) : result ? (
              <div className="space-y-3">
                <ResultRow label="Net Weight" value={formatWeight(result.netWeight)} />
                <ResultRow
                  label="Wastage"
                  value={
                    result.wastagePercent
                      ? `${result.wastagePercent}%  ·  ${formatWeight(result.wastageWeight)}`
                      : formatWeight(result.wastageWeight)
                  }
                />
                <Separator />
                <ResultRow label="Gross Weight" value={formatWeight(result.grossWeight)} emphasize />
                <ResultRow label="Gold Rate" value={formatRatePerGram(result.goldRate)} />
                <Separator />
                <ResultRow
                  label="Gold Value"
                  value={formatCurrency(result.goldValue)}
                  emphasize
                  gold
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Calculating...</p>
            )}
            <p className="mt-4 text-[11px] text-muted-foreground">
              {pending ? "Recalculating on server..." : "Verified by the server calculation engine."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultRow({
  label,
  value,
  emphasize,
  gold,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span
        className={
          gold
            ? "text-xl font-semibold text-gold"
            : emphasize
              ? "text-base font-semibold text-foreground"
              : "text-sm text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
