import type { DiscountTypeValue } from "@/services/sale-pricing.service";

export const PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "OTHER", "CREDIT"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodValue, string> = {
  CASH: "Cash",
  CARD: "Card",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
  CREDIT: "Credit",
};

export const SALE_STATUSES = ["COMPLETED", "PARTIALLY_RETURNED", "RETURNED"] as const;
export type SaleStatusValue = (typeof SALE_STATUSES)[number];

export const SALE_STATUS_LABELS: Record<SaleStatusValue, string> = {
  COMPLETED: "Completed",
  PARTIALLY_RETURNED: "Partially Returned",
  RETURNED: "Returned",
};

export const RETURN_STATUSES = ["RETURN_REQUESTED", "RETURNED"] as const;
export type ReturnStatusValue = (typeof RETURN_STATUSES)[number];

export const PAYMENT_STATUSES = ["PAID", "ON_CREDIT"] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];

/** Derived, not stored — PAID means balanceAmount is zero. */
export function derivePaymentStatus(balanceAmount: string | number): PaymentStatusValue {
  return Number(balanceAmount) > 0 ? "ON_CREDIT" : "PAID";
}

/** Server-recalculated catalog data for one item — the only thing the POS
 * screen is allowed to display for pricing; the client never invents these
 * numbers itself. All money/weight fields are pre-serialized strings since
 * Prisma Decimal cannot cross the Server -> Client Component boundary. */
export type PosCatalogItem = {
  inventoryItemId: string;
  barcodeCode: string | null;
  productName: string;
  categoryName: string | null;
  imageUrl: string | null;
  status: string;
  purity: string;
  netWeight: string;
  wastageType: string;
  wastagePercent: string | null;
  wastageWeight: string;
  grossWeight: string;
  goldRatePerGram: string;
  goldValue: string;
  makingCharge: string;
  stoneCharge: string;
  diamondCharge: string;
  otherCharge: string;
  sellingPrice: string;
};

export type SaleCartItemInput = {
  inventoryItemId: string;
  discountType?: DiscountTypeValue | null;
  discountValue?: number | null;
};

export type SalePaymentInput = {
  method: PaymentMethodValue;
  amount: number;
  reference?: string;
  notes?: string;
};

export type CompleteSaleInput = {
  items: SaleCartItemInput[];
  customerId?: string | null;
  payments: SalePaymentInput[];
  /** Client-generated, echoed back — see SALES.md "Double-submit protection". */
  clientRequestId?: string;
};

export type CompletedSale = {
  id: string;
  invoiceNumber: string;
  grandTotal: string;
};

export type SaleListFilters = {
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  paymentStatus?: PaymentStatusValue;
  status?: SaleStatusValue;
  customerId?: string;
  createdById?: string;
  sort?: "NEWEST" | "OLDEST" | "VALUE_HIGH" | "VALUE_LOW";
  page?: number;
  pageSize?: number;
};
