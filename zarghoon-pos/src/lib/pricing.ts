import { rateForKarat } from "../store/goldRateStore";
import type { Product } from "../store/inventoryStore";

export interface PriceBreakdown {
  ratePerGram: number;
  goldValue: number;
  makingCharge: number;
  stoneCharge: number;
  total: number;
}

export function computeProductPrice(
  product: Product,
  rates: { k18: number; k21: number; k22: number; k24: number }
): PriceBreakdown {
  const ratePerGram = rateForKarat(rates, product.karat);
  const goldValue = ratePerGram * product.weightGrams;
  const makingCharge = product.makingChargePerGram * product.weightGrams;
  const total = goldValue + makingCharge + product.stoneCharge;
  return { ratePerGram, goldValue, makingCharge, stoneCharge: product.stoneCharge, total };
}
