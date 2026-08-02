import type { Product } from "../store/inventoryStore";

export interface PriceBreakdown {
  ratePerGram: number;
  total: number;
}

/**
 * Value = Gross Weight x today's 21K gold rate.
 */
export function computeProductPrice(
  product: Product,
  rates: { k21: number }
): PriceBreakdown {
  const ratePerGram = rates.k21;
  const total = product.grossWeightGrams * ratePerGram;
  return { ratePerGram, total };
}
