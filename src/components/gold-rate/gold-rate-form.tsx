"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  setTodaysGoldRates,
  type SetGoldRatesState,
} from "@/lib/actions/gold-rate.actions";

const RATE_FIELDS: { name: "k24" | "k22" | "k21" | "k18"; label: string; required: true }[] = [
  { name: "k24", label: "24K Gold", required: true },
  { name: "k22", label: "22K Gold", required: true },
  { name: "k21", label: "21K Gold", required: true },
  { name: "k18", label: "18K Gold", required: true },
];

export function GoldRateForm({ onSaved }: { onSaved?: () => void }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SetGoldRatesState, FormData>(
    setTodaysGoldRates,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Today's gold rates have been saved.");
      router.refresh();
      onSaved?.();
    }
  }, [state, router, onSaved]);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {RATE_FIELDS.map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={field.name}>{field.label}</Label>
            <div className="relative">
              <Input
                id={field.name}
                name={field.name}
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                required
                className="pr-14"
                aria-invalid={!!state?.fieldErrors?.[field.name]}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                /gram
              </span>
            </div>
            {state?.fieldErrors?.[field.name] && (
              <p className="text-xs text-danger">{state.fieldErrors[field.name]}</p>
            )}
          </div>
        ))}

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="silver">
            Silver <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <Input
              id="silver"
              name="silver"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              className="pr-14"
              aria-invalid={!!state?.fieldErrors?.silver}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              /gram
            </span>
          </div>
          {state?.fieldErrors?.silver && (
            <p className="text-xs text-danger">{state.fieldErrors.silver}</p>
          )}
        </div>
      </div>

      {state?.error && !state.fieldErrors && (
        <p className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? "Saving..." : "Save Rates & Open Dashboard"}
      </Button>
    </form>
  );
}
