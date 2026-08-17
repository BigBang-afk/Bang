export const SUPPLIER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
export type SupplierStatusValue = (typeof SUPPLIER_STATUSES)[number];

export const SUPPLIER_STATUS_LABELS: Record<SupplierStatusValue, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

export const SUPPLIER_LIST_SORTS = ["NEWEST", "OLDEST", "NAME"] as const;
export type SupplierListSortValue = (typeof SUPPLIER_LIST_SORTS)[number];
