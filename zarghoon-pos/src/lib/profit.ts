import type { SaleLineItem } from "../store/salesStore";

export interface ProfitBreakdown {
  netWeightGrams: number;
  kaat: number;
  buyPrice: number;
  salePrice: number;
  profitCash: number;
  profitGold: number;
}

/**
 * Buy Price = the cash cost of the gold that went into this line (buy price in
 * gold, valued at the sale's own gold rate) x qty.
 * Sale Price = what the line was actually sold for.
 * Profit in Cash = Sale Price - Buy Price.
 * Profit in Gold = Profit in Cash / the sale's gold rate.
 */
export function computeProfit(item: SaleLineItem): ProfitBreakdown {
  const buyPrice = item.buyPriceInGold * item.ratePerGram * item.qty;
  const salePrice = item.lineTotal;
  const profitCash = salePrice - buyPrice;
  const profitGold = item.ratePerGram > 0 ? profitCash / item.ratePerGram : 0;
  return {
    netWeightGrams: item.netWeightGrams * item.qty,
    kaat: item.kaat,
    buyPrice,
    salePrice,
    profitCash,
    profitGold,
  };
}
