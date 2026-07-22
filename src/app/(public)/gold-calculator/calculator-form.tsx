"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { GOLD_PURITIES, WEIGHT_UNITS, WEIGHT_UNIT_LABELS, convertToGrams, type GoldPurity, type WeightUnit } from "@/lib/constants";
import { calculateProductPrice, type ActiveRateMap } from "@/lib/pricing/product-pricing";
import { formatDateTime, formatPKR, formatWeight } from "@/lib/utils";
import { buildWhatsAppUrl, calculatorEstimateMessage } from "@/lib/whatsapp";

const calculatorSchema = z.object({
  purity: z.enum(GOLD_PURITIES),
  weight: z.coerce.number().positive("Enter a weight greater than zero"),
  unit: z.enum(WEIGHT_UNITS),
  discountType: z.enum(["none", "fixed", "percentage"]),
  discountValue: z.coerce.number().min(0).default(0),
});
type CalculatorInput = z.infer<typeof calculatorSchema>;

export function GoldCalculatorForm({ activeRates, whatsappNumber }: { activeRates: ActiveRateMap; whatsappNumber: string }) {
  const [submitted, setSubmitted] = useState<CalculatorInput | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CalculatorInput>({
    resolver: zodResolver(calculatorSchema),
    defaultValues: { purity: "22K", unit: "gram", discountType: "none", discountValue: 0 },
  });

  const result = useMemo(() => {
    if (!submitted) return null;
    const grams = convertToGrams(submitted.weight, submitted.unit as WeightUnit);
    const price = calculateProductPrice(
      {
        purity: submitted.purity as GoldPurity,
        grossWeightGrams: grams,
        pricingMethod: "automatic",
        fixedPrice: null,
        discountType: submitted.discountType,
        discountValue: submitted.discountValue,
      },
      activeRates
    );
    return { grams, price };
  }, [submitted, activeRates]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <form onSubmit={handleSubmit(setSubmitted)} className="space-y-4 rounded-sm border border-charcoal/10 bg-white p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="purity" required>Gold Purity</Label>
            <Select id="purity" {...register("purity")}>
              {GOLD_PURITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="unit" required>Weight Unit</Label>
            <Select id="unit" {...register("unit")}>
              {WEIGHT_UNITS.map((u) => <option key={u} value={u}>{WEIGHT_UNIT_LABELS[u]}</option>)}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="weight" required>Gross Weight</Label>
          <Input id="weight" type="number" step="0.001" min="0" {...register("weight")} />
          {errors.weight && <p className="mt-1 text-xs text-red-600">{errors.weight.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discountType">Discount</Label>
            <Select id="discountType" {...register("discountType")}>
              <option value="none">No discount</option>
              <option value="fixed">Fixed (PKR)</option>
              <option value="percentage">Percentage (%)</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="discountValue">Discount Value</Label>
            <Input id="discountValue" type="number" step="0.01" min="0" {...register("discountValue")} />
          </div>
        </div>

        <Button type="submit" variant="gold" className="w-full">
          <Calculator size={16} /> Calculate Estimate
        </Button>
      </form>

      <div className="rounded-sm border border-charcoal/10 bg-ivory-dark/40 p-6 sm:p-8">
        <h3 className="mb-4 font-serif text-xl text-charcoal">Estimated Price</h3>
        {!result ? (
          <p className="text-sm text-charcoal/50">Fill in the form to see your estimate.</p>
        ) : !result.price.visible ? (
          <p className="text-sm text-charcoal/70">{result.price.label}</p>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-charcoal/60">Entered Weight</span><span>{submitted?.weight} {submitted && WEIGHT_UNIT_LABELS[submitted.unit as WeightUnit]}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/60">Converted Weight</span><span>{formatWeight(result.grams)}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/60">Purity</span><span>{submitted?.purity}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/60">Rate / Gram</span><span>{formatPKR(result.price.ratePerGramUsed)}</span></div>
            <div className="flex justify-between"><span className="text-charcoal/60">Base Price</span><span>{formatPKR(result.price.basePrice)}</span></div>
            {result.price.discountAmount > 0 && (
              <div className="flex justify-between text-gold-dark"><span>Discount</span><span>-{formatPKR(result.price.discountAmount)}</span></div>
            )}
            <div className="flex justify-between border-t border-charcoal/10 pt-2 font-serif text-lg">
              <span>Final Estimated Price</span><span>{formatPKR(result.price.finalPrice)}</span>
            </div>
            <p className="pt-1 text-xs text-charcoal/40">Calculated {formatDateTime(result.price.calculatedAt)}</p>
            <p className="pt-3 text-xs italic text-charcoal/50">
              This calculator provides an estimate only. Please contact Zarghoon Jewellers for the final confirmed price.
            </p>
            <a
              href={buildWhatsAppUrl(whatsappNumber, calculatorEstimateMessage({
                purity: submitted!.purity as GoldPurity,
                grossWeightGrams: result.grams,
                estimatedPrice: result.price.finalPrice,
              }))}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-sm bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1ebe57]"
            >
              Confirm on WhatsApp
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
