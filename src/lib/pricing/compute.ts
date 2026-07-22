import { calculateProductPrice, type ActiveRateMap, type PriceResult } from "@/lib/pricing/product-pricing";
import type { Product } from "@/types/database";

export function computeProductPrice(product: Product, activeRates: ActiveRateMap): PriceResult {
  return calculateProductPrice(
    {
      purity: product.purity,
      grossWeightGrams: parseFloat(product.gross_weight_grams),
      pricingMethod: product.pricing_method,
      fixedPrice: product.fixed_price ? parseFloat(product.fixed_price) : null,
      discountType: product.discount_type,
      discountValue: parseFloat(product.discount_value),
    },
    activeRates
  );
}
