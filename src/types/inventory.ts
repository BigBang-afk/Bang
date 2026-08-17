import type { GoldPurity, WastageType } from "@/types/gold";

export const STOCK_STATUSES = [
  "IN_STOCK",
  "RESERVED",
  "SOLD",
  "RETURNED",
  "DAMAGED",
  "LOST",
] as const;
export type StockStatusValue = (typeof STOCK_STATUSES)[number];

export const STOCK_STATUS_LABELS: Record<StockStatusValue, string> = {
  IN_STOCK: "In Stock",
  RESERVED: "Reserved",
  SOLD: "Sold",
  RETURNED: "Returned",
  DAMAGED: "Damaged",
  LOST: "Lost",
};

/** Status transitions allowed from the UI. Terminal statuses have no outgoing edges. */
export const STOCK_STATUS_TRANSITIONS: Record<StockStatusValue, StockStatusValue[]> = {
  IN_STOCK: ["RESERVED", "SOLD", "DAMAGED", "LOST"],
  RESERVED: ["IN_STOCK", "SOLD", "DAMAGED", "LOST"],
  SOLD: ["RETURNED"],
  RETURNED: ["IN_STOCK", "DAMAGED"],
  DAMAGED: ["IN_STOCK", "LOST"],
  LOST: [],
};

export const INVENTORY_SORT_OPTIONS = [
  "NEWEST",
  "OLDEST",
  "PRICE_HIGH",
  "PRICE_LOW",
  "WEIGHT_HIGH",
  "WEIGHT_LOW",
  "PROFIT_HIGH",
] as const;
export type InventorySortOption = (typeof INVENTORY_SORT_OPTIONS)[number];

export type CreateInventoryItemInput = {
  productName: string;
  categoryId: string;
  subcategory?: string;
  designNumber?: string;
  supplier?: string;
  karigar?: string;
  imageUrl?: string;
  notes?: string;

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
  sellingPrice: number;
  confirmLowerPrice?: boolean;

  /** Set only by purchase.service.ts when pushing a purchased item into inventory — see PURCHASE-SYSTEM.md "Purchased vs. manufactured stock". Every Phase 2 caller omits these and gets the original MANUFACTURED/no-supplier behavior unchanged. */
  source?: "MANUFACTURED" | "PURCHASED";
  supplierId?: string;
  purchaseItemId?: string;
};

export type UpdateInventoryItemInput = CreateInventoryItemInput & {
  id: string;
  removeImage?: boolean;
};

export class LowerPriceConfirmationRequiredError extends Error {
  constructor() {
    super(
      "The new selling price is below total cost. Confirm to save it as a loss.",
    );
    this.name = "LowerPriceConfirmationRequiredError";
  }
}

/**
 * Plain-serializable projection of InventoryItemDetail, safe to pass from a
 * Server Component into the client StockForm — Prisma's Decimal fields
 * cannot cross that boundary directly (see toEditableStockItem in
 * inventory-item.service.ts).
 */
export type EditableStockItem = {
  id: string;
  purity: GoldPurity;
  netWeight: string;
  wastageType: WastageType;
  wastagePercent: string | null;
  wastageWeight: string;
  goldRatePerGram: string;
  makingCharge: string;
  stoneCharge: string;
  diamondCharge: string;
  otherCharge: string;
  sellingPrice: string;
  barcodeCode: string | null;
  product: {
    name: string;
    categoryId: string;
    subcategory: string | null;
    designNumber: string | null;
    supplier: string | null;
    karigar: string | null;
    notes: string | null;
    imageUrl: string | null;
  };
};

export type InventoryListFilters = {
  search?: string;
  categoryId?: string;
  purity?: GoldPurity;
  status?: StockStatusValue;
  supplier?: string;
  karigar?: string;
  minPrice?: number;
  maxPrice?: number;
  minWeight?: number;
  maxWeight?: number;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: InventorySortOption;
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
};
