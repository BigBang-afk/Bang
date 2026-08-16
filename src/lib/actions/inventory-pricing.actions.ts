"use server";

import { z } from "zod";
import { calculateGoldValue, GoldCalculationError } from "@/services/gold-calculation.service";
import { calculateInventoryPricing, InventoryPricingError } from "@/services/inventory-pricing.service";
import { WASTAGE_TYPES } from "@/types/gold";

const pricingPreviewSchema = z.object({
  netWeight: z.coerce.number(),
  goldRate: z.coerce.number(),
  wastageType: z.enum(WASTAGE_TYPES),
  wastagePercent: z.coerce.number().optional(),
  wastageGrams: z.coerce.number().optional(),
  makingCharge: z.coerce.number().optional(),
  stoneCharge: z.coerce.number().optional(),
  diamondCharge: z.coerce.number().optional(),
  otherCharge: z.coerce.number().optional(),
  sellingPrice: z.coerce.number(),
});

export type InventoryPricingPreviewResult = {
  netWeight: string;
  wastageWeight: string;
  wastagePercent: string | null;
  grossWeight: string;
  goldRate: string;
  goldValue: string;
  makingCharge: string;
  stoneCharge: string;
  diamondCharge: string;
  otherCharge: string;
  totalCost: string;
  sellingPrice: string;
  expectedProfit: string;
  profitMarginPercent: string;
};

export type InventoryPricingPreviewState =
  | { result: InventoryPricingPreviewResult; error?: undefined; field?: undefined }
  | { error: string; field?: string; result?: undefined };

/**
 * The single server-side entry point for the Add/Edit Stock live preview.
 * Combines the Phase 1 gold-calculation engine with the Phase 2 inventory
 * pricing service — the exact same pair of pure functions used at save
 * time in inventory-item.service.ts — so the number shown while typing is
 * always what will actually be saved, never a client-computed guess.
 */
export async function previewInventoryPricingAction(
  input: unknown,
): Promise<InventoryPricingPreviewState> {
  const parsed = pricingPreviewSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Enter valid values." };
  }
  const data = parsed.data;

  try {
    const goldCalc = calculateGoldValue({
      netWeight: data.netWeight,
      goldRate: data.goldRate,
      wastage:
        data.wastageType === "PERCENTAGE"
          ? { type: "PERCENTAGE", wastagePercent: data.wastagePercent ?? 0 }
          : { type: "FIXED_GRAMS", wastageGrams: data.wastageGrams ?? 0 },
    });

    const pricing = calculateInventoryPricing({
      goldValue: goldCalc.goldValue,
      makingCharge: data.makingCharge,
      stoneCharge: data.stoneCharge,
      diamondCharge: data.diamondCharge,
      otherCharge: data.otherCharge,
      sellingPrice: data.sellingPrice,
    });

    return {
      result: {
        netWeight: goldCalc.netWeight.toString(),
        wastageWeight: goldCalc.wastageWeight.toString(),
        wastagePercent: goldCalc.wastagePercent ? goldCalc.wastagePercent.toString() : null,
        grossWeight: goldCalc.grossWeight.toString(),
        goldRate: goldCalc.goldRate.toString(),
        goldValue: goldCalc.goldValue.toString(),
        makingCharge: pricing.makingCharge.toString(),
        stoneCharge: pricing.stoneCharge.toString(),
        diamondCharge: pricing.diamondCharge.toString(),
        otherCharge: pricing.otherCharge.toString(),
        totalCost: pricing.totalCost.toString(),
        sellingPrice: pricing.sellingPrice.toString(),
        expectedProfit: pricing.expectedProfit.toString(),
        profitMarginPercent: pricing.profitMarginPercent.toString(),
      },
    };
  } catch (error) {
    if (error instanceof GoldCalculationError || error instanceof InventoryPricingError) {
      return { error: error.message, field: error.field };
    }
    throw error;
  }
}
