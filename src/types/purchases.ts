import type { GoldPurity, WastageType } from "@/types/gold";

/** Payment methods valid for an actual purchase payment — CREDIT is meaningless here (nothing was actually paid); the unpaid remainder is just Purchase.balanceAmount / the supplier's cash ledger position, exactly like the customer ledger split. */
export const PURCHASE_PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;
export type PurchasePaymentMethodValue = (typeof PURCHASE_PAYMENT_METHODS)[number];

export type PurchaseItemInput = {
  productName: string;
  categoryId?: string;
  purity: GoldPurity;
  netWeight: number;
  goldRate: number;
  wastageType: WastageType;
  wastagePercent?: number;
  wastageGrams?: number;
  makingCharge?: number;
  stoneCharge?: number;
  diamondCharge?: number;
  otherCharge?: number;
  notes?: string;
  /** Pushes this line into inventory as a sellable InventoryItem (source PURCHASED) — see PURCHASE-SYSTEM.md "Purchased vs. manufactured stock". Requires sellingPrice. */
  addToInventory: boolean;
  sellingPrice?: number;
};

export type PurchasePaymentInput = {
  amount: number;
  method: PurchasePaymentMethodValue;
  reference?: string;
  notes?: string;
};

export type CreatePurchaseInput = {
  supplierId: string;
  purchaseDate?: Date;
  referenceNumber?: string;
  items: PurchaseItemInput[];
  payments: PurchasePaymentInput[];
  notes?: string;
};

export const PURCHASE_LIST_SORTS = ["NEWEST", "OLDEST", "AMOUNT_HIGH", "BALANCE_HIGH"] as const;
export type PurchaseListSortValue = (typeof PURCHASE_LIST_SORTS)[number];

export const PURCHASE_PAYMENT_STATUSES = ["UNPAID", "PARTIALLY_PAID", "PAID"] as const;
export type PurchasePaymentStatusValue = (typeof PURCHASE_PAYMENT_STATUSES)[number];

export function derivePurchasePaymentStatus(paidAmount: string, grandTotal: string): PurchasePaymentStatusValue {
  const paid = Number(paidAmount);
  const total = Number(grandTotal);
  if (paid <= 0) return "UNPAID";
  if (paid >= total) return "PAID";
  return "PARTIALLY_PAID";
}
