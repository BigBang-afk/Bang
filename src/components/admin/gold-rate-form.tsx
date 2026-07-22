"use client";

import { useActionState, useState } from "react";
import { toast } from "sonner";
import { useEffect } from "react";
import { updateGoldRateAction, applyBaseRateAction, type ActionState } from "@/app/admin/(protected)/gold-rates/actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { GoldRate } from "@/types/database";
import { formatDateTime, formatPKR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const initialState: ActionState = {};

function useToastOnResult(state: ActionState) {
  useEffect(() => {
    if (state.success) toast.success(state.success);
    if (state.error) toast.error(state.error);
  }, [state]);
}

export function BaseRateForm() {
  const [state, formAction, isPending] = useActionState(applyBaseRateAction, initialState);
  useToastOnResult(state);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-end">
      <div className="sm:col-span-2">
        <Label htmlFor="rate_24k_per_tola" required>24K Base Rate (per tola, PKR)</Label>
        <Input id="rate_24k_per_tola" name="rate_24k_per_tola" type="number" step="0.01" min="0" required placeholder="e.g. 275000" />
      </div>
      <div>
        <Label htmlFor="rate_source">Source</Label>
        <Input id="rate_source" name="rate_source" defaultValue="Manual" />
      </div>
      <div>
        <Button type="submit" variant="gold" className="w-full" disabled={isPending}>
          {isPending ? "Applying…" : "Apply & Derive All"}
        </Button>
      </div>
      <p className="sm:col-span-4 text-xs text-charcoal/50">
        Derives 22K/21K/18K as 24K × (purity/24). Purities with manual override enabled below are skipped.
      </p>
    </form>
  );
}

export function PurityRateCard({ rate }: { rate: GoldRate }) {
  const [state, formAction, isPending] = useActionState(updateGoldRateAction, initialState);
  const [mode, setMode] = useState<"per_tola" | "per_gram">("per_tola");
  useToastOnResult(state);

  return (
    <div className="rounded-sm border border-charcoal/10 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-lg">{rate.purity}</h3>
        <div className="flex items-center gap-2">
          {rate.is_manual_override && <Badge tone="gold">Override</Badge>}
          <Badge tone={rate.is_manual ? "slate" : "green"}>{rate.is_manual ? "Manual" : "API"}</Badge>
        </div>
      </div>

      <div className="mb-4 space-y-1 text-sm">
        <p>Per Tola: <span className="font-medium">{formatPKR(rate.rate_per_tola)}</span></p>
        <p>Per 10g: <span className="font-medium">{formatPKR(rate.rate_per_10_grams)}</span></p>
        <p>Per Gram: <span className="font-medium">{formatPKR(rate.rate_per_gram)}</span></p>
        <p className="text-charcoal/50">
          Change: {parseFloat(rate.rate_change) >= 0 ? "+" : ""}{formatPKR(rate.rate_change)} ({rate.percentage_change}%)
        </p>
        <p className="text-xs text-charcoal/40">Updated {formatDateTime(rate.updated_at)}</p>
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="purity" value={rate.purity} />
        <input type="hidden" name="input_mode" value={mode} />

        <div className="flex gap-2 text-xs">
          <button type="button" onClick={() => setMode("per_tola")} className={mode === "per_tola" ? "font-semibold text-gold-dark" : "text-charcoal/50"}>
            Enter per Tola
          </button>
          <span className="text-charcoal/30">|</span>
          <button type="button" onClick={() => setMode("per_gram")} className={mode === "per_gram" ? "font-semibold text-gold-dark" : "text-charcoal/50"}>
            Enter per Gram
          </button>
        </div>

        {mode === "per_tola" ? (
          <Input name="rate_per_tola" type="number" step="0.01" min="0" placeholder="Rate per tola" />
        ) : (
          <Input name="rate_per_gram" type="number" step="0.01" min="0" placeholder="Rate per gram" />
        )}

        <Input name="rate_source" defaultValue={rate.rate_source} placeholder="Source" />
        <textarea name="notes" defaultValue={rate.notes ?? ""} placeholder="Notes" className="w-full rounded-sm border border-charcoal/20 px-3 py-2 text-sm" rows={2} />

        <label className="flex items-center gap-2 text-xs text-charcoal/70">
          <input type="checkbox" name="is_manual_override" defaultChecked={rate.is_manual_override} />
          Manual override (this purity ignores auto-derivation from base 24K rate)
        </label>

        <Button type="submit" size="sm" className="w-full" disabled={isPending}>
          {isPending ? "Saving…" : "Update Rate"}
        </Button>
      </form>
    </div>
  );
}
