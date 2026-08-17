"use server";

import { calculateGoldValue, GoldCalculationError } from "@/services/gold-calculation.service";
import { goldCalculationInputSchema } from "@/lib/validation/gold-calculation";

export type CalculatorResultDTO = {
  netWeight: string;
  wastageType: string;
  wastagePercent: string | null;
  wastageWeight: string;
  grossWeight: string;
  goldRate: string;
  makingCharges: string | null;
  goldValue: string;
};

export type CalculateGoldValueState =
  | { result: CalculatorResultDTO; error?: undefined }
  | { error: string; field?: string; result?: undefined };

/**
 * The single server-side entry point for the jewelry weight calculation
 * engine. The calculator UI calls this on every change so the figure shown
 * to staff is always the authoritative, server-computed value — never a
 * client-side-only computation.
 */
export async function calculateGoldValueAction(input: unknown): Promise<CalculateGoldValueState> {
  const parsed = goldCalculationInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter valid calculator values." };
  }

  const { netWeight, goldRate, wastageType, wastagePercent, wastageGrams, pricingMode, makingCharges } =
    parsed.data;

  try {
    const result = calculateGoldValue({
      netWeight,
      goldRate,
      pricingMode,
      makingCharges,
      wastage:
        wastageType === "PERCENTAGE"
          ? { type: "PERCENTAGE", wastagePercent: wastagePercent ?? 0 }
          : { type: "FIXED_GRAMS", wastageGrams: wastageGrams ?? 0 },
    });

    return {
      result: {
        netWeight: result.netWeight.toString(),
        wastageType: result.wastageType,
        wastagePercent: result.wastagePercent ? result.wastagePercent.toString() : null,
        wastageWeight: result.wastageWeight.toString(),
        grossWeight: result.grossWeight.toString(),
        goldRate: result.goldRate.toString(),
        makingCharges: result.makingCharges ? result.makingCharges.toString() : null,
        goldValue: result.goldValue.toString(),
      },
    };
  } catch (error) {
    if (error instanceof GoldCalculationError) {
      return { error: error.message, field: error.field };
    }
    throw error;
  }
}
