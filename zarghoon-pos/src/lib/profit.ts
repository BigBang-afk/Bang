import type { Sale, SaleLineItem } from "../store/salesStore";

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
 * Sale Price = the line's share of the sale's total AFTER discount — the
 * sale-level discount is allocated across lines in proportion to each
 * line's share of the subtotal, so summing Sale Price across all of a
 * sale's items always equals that sale's total.
 * Profit in Cash = Sale Price - Buy Price.
 * Profit in Gold = Profit in Cash / the sale's gold rate.
 */
export function computeProfit(item: SaleLineItem, sale: Pick<Sale, "subtotal" | "discount">): ProfitBreakdown {
  const buyPrice = item.buyPriceInGold * item.ratePerGram * item.qty;
  const discountShare = sale.subtotal > 0 ? (item.lineTotal / sale.subtotal) * sale.discount : 0;
  const salePrice = item.lineTotal - discountShare;
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
