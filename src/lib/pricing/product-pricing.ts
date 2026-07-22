import { roundMoney } from "@/lib/pricing/gold-rate";
import type { DiscountType, GoldPurity, PricingMethod } from "@/lib/constants";

export interface ActiveRateMap {
  [purity: string]: { ratePerGram: number; effectiveDate: string; effectiveTime: string } | undefined;
}

export interface PriceInput {
  purity: GoldPurity;
  grossWeightGrams: number;
  pricingMethod: PricingMethod;
  fixedPrice: number | null;
  discountType: DiscountType;
  discountValue: number;
}

export type PriceResult =
  | {
      visible: true;
      available: true;
      basePrice: number;
      discountAmount: number;
      discountPercentage: number | null;
      finalPrice: number;
      ratePerGramUsed: number | null;
      rateEffectiveAt: string | null;
      calculatedAt: string;
      isEstimate: boolean;
    }
  | {
      visible: false;
      available: false;
      label: "Contact for Latest Price" | "Price Available on Request" | "Gold rate unavailable. Contact for latest price.";
      calculatedAt: string;
    };

/**
 * THE canonical pricing calculation (server-side source of truth).
 *
 * Formula: Item Price = Gross Weight in Grams × Gold Rate Per Gram
 * Gross weight only — never net weight. No making charges, stone charges,
 * or tax are added unless requested in a future iteration.
 */
export function calculateProductPrice(input: PriceInput, activeRates: ActiveRateMap): PriceResult {
  const now = new Date().toISOString();

  if (input.pricingMethod === "contact") {
    return { visible: false, available: false, label: "Contact for Latest Price", calculatedAt: now };
  }
  if (input.pricingMethod === "on_request") {
    return { visible: false, available: false, label: "Price Available on Request", calculatedAt: now };
  }

  let basePrice: number;
  let ratePerGramUsed: number | null = null;
  let rateEffectiveAt: string | null = null;

  if (input.pricingMethod === "fixed") {
    basePrice = input.fixedPrice ?? 0;
  } else {
    // automatic
    const activeRate = activeRates[input.purity];
    if (!activeRate || activeRate.ratePerGram <= 0) {
      return {
        visible: false,
        available: false,
        label: "Gold rate unavailable. Contact for latest price.",
        calculatedAt: now,
      };
    }
    ratePerGramUsed = activeRate.ratePerGram;
    rateEffectiveAt = `${activeRate.effectiveDate}T${activeRate.effectiveTime}`;
    basePrice = roundMoney(input.grossWeightGrams * activeRate.ratePerGram);
  }

  let discountAmount = 0;
  let discountPercentage: number | null = null;

  if (input.discountType === "fixed" && input.discountValue > 0) {
    discountAmount = roundMoney(Math.min(input.discountValue, basePrice));
  } else if (input.discountType === "percentage" && input.discountValue > 0) {
    discountPercentage = input.discountValue;
    discountAmount = roundMoney((basePrice * input.discountValue) / 100);
  }

  const finalPrice = roundMoney(Math.max(0, basePrice - discountAmount));

  return {
    visible: true,
    available: true,
    basePrice,
    discountAmount,
    discountPercentage,
    finalPrice,
    ratePerGramUsed,
    rateEffectiveAt,
    calculatedAt: now,
    isEstimate: input.pricingMethod === "automatic",
  };
}
