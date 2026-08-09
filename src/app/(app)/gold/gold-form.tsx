"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGoldTransactionAction, updateGoldTransactionAction } from "@/lib/actions/gold";
import { Card, CardContent } from "@/components/ui/card";
import { Input, FormField, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUsd, formatPkr } from "@/lib/money";
import { todayDateInputValue } from "@/lib/utils";

export interface GoldFormValues {
  id?: string;
  date: string;
  txType: string;
  goldType: string;
  purity: string;
  purityCustomLabel: string;
  weightGrams: string;
  pricePerGramPkr: string;
  dealer: string;
  notes: string;
}

const defaults: GoldFormValues = {
  date: todayDateInputValue(),
  txType: "BUY",
  goldType: "",
  purity: "24K",
  purityCustomLabel: "",
  weightGrams: "",
  pricePerGramPkr: "",
  dealer: "",
  notes: "",
};

export function GoldForm({ initial, usdToPkrRate }: { initial?: Partial<GoldFormValues>; usdToPkrRate: number }) {
  const router = useRouter();
  const [values, setValues] = useState<GoldFormValues>({ ...defaults, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = Boolean(values.id);

  function set<K extends keyof GoldFormValues>(key: K, v: GoldFormValues[K]) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  const totalPkr = (Number(values.weightGrams) || 0) * (Number(values.pricePerGramPkr) || 0);
  const totalUsd = usdToPkrRate > 0 ? totalPkr / usdToPkrRate : 0;

  function submit() {
    setError(null);
    if (!values.weightGrams || Number(values.weightGrams) <= 0) return setError("Weight must be greater than zero.");
    if (!values.pricePerGramPkr || Number(values.pricePerGramPkr) <= 0) return setError("Price per gram must be greater than zero.");

    const payload = {
      id: values.id,
      date: values.date,
      txType: values.txType,
      goldType: values.goldType,
      purity: values.purity,
      purityCustomLabel: values.purityCustomLabel,
      weightGrams: Number(values.weightGrams),
      pricePerGramPkr: Number(values.pricePerGramPkr),
      dealer: values.dealer,
      notes: values.notes,
    };

    startTransition(async () => {
      const result = isEdit ? await updateGoldTransactionAction(payload) : await createGoldTransactionAction(payload);
      if (result?.error) setError(result.error);
      else {
        router.push("/gold");
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <FormField label="Date">
            <Input type="date" value={values.date} onChange={(e) => set("date", e.target.value)} />
          </FormField>
          <FormField label="Transaction Type">
            <Select value={values.txType} onChange={(e) => set("txType", e.target.value)}>
              <option value="BUY">Buy</option>
              <option value="SELL">Sell</option>
            </Select>
          </FormField>
          <FormField label="Gold Type">
            <Input value={values.goldType} onChange={(e) => set("goldType", e.target.value)} placeholder="Bar, Coin, Jewelry…" />
          </FormField>
          <FormField label="Purity">
            <Select value={values.purity} onChange={(e) => set("purity", e.target.value)}>
              <option value="24K">24K</option>
              <option value="22K">22K</option>
              <option value="21K">21K</option>
              <option value="18K">18K</option>
              <option value="CUSTOM">Custom</option>
            </Select>
          </FormField>
          {values.purity === "CUSTOM" && (
            <FormField label="Custom Purity Label">
              <Input value={values.purityCustomLabel} onChange={(e) => set("purityCustomLabel", e.target.value)} />
            </FormField>
          )}
          <FormField label="Weight (grams)">
            <Input type="number" step="any" min="0" value={values.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
          </FormField>
          <FormField label="Price Per Gram (PKR)">
            <Input type="number" step="any" min="0" value={values.pricePerGramPkr} onChange={(e) => set("pricePerGramPkr", e.target.value)} />
          </FormField>
          <FormField label="Dealer">
            <Input value={values.dealer} onChange={(e) => set("dealer", e.target.value)} />
          </FormField>
        </div>
        <FormField label="Notes">
          <Textarea value={values.notes} onChange={(e) => set("notes", e.target.value)} rows={2} />
        </FormField>

        <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface-2 p-4 text-center">
          <div>
            <p className="text-[10px] text-muted">Total Cost (PKR)</p>
            <p className="text-sm font-semibold">{formatPkr(totalPkr)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted">USD Equivalent</p>
            <p className="text-sm font-semibold">{formatUsd(totalUsd)}</p>
          </div>
        </div>

        {error && <p className="text-sm text-negative">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Save Purchase"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
