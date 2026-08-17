/**
 * Central registry of permission keys. New modules add a key here and seed
 * it in prisma/seed.ts — never hardcode a raw string check anywhere else.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  GOLD_RATE_CREATE: "gold_rate:create",
  GOLD_RATE_READ: "gold_rate:read",
  SETTINGS_MANAGE: "settings:manage",
  USER_MANAGE: "user:manage",
  INVENTORY_VIEW: "inventory:view",
  INVENTORY_MANAGE: "inventory:manage",
  CATEGORY_MANAGE: "category:manage",
  BARCODE_PRINT: "barcode:print",
  SALES_VIEW: "sales:view",
  SALES_CREATE: "sales:create",
  SALES_RETURN: "sales:return",
  CUSTOMERS_VIEW: "customers:view",
  CUSTOMERS_CREATE: "customers:create",
  CUSTOMERS_MANAGE: "customers:manage",
  CUSTOMERS_NOTES: "customers:notes",
  CUSTOMERS_LEDGER: "customers:ledger",
  CUSTOMERS_PAYMENT: "customers:payment",
  CUSTOMERS_EXPORT: "customers:export",
  CUSTOMERS_SEGMENTS: "customers:segments",
  KARIGARS_VIEW: "karigars:view",
  KARIGARS_MANAGE: "karigars:manage",
  KARIGARS_GOLD: "karigars:gold",
  KARIGARS_CASH: "karigars:cash",
  SUPPLIERS_VIEW: "suppliers:view",
  SUPPLIERS_MANAGE: "suppliers:manage",
  PURCHASES_VIEW: "purchases:view",
  PURCHASES_CREATE: "purchases:create",
  GOLD_LEDGER_VIEW: "gold_ledger:view",
  GOLD_LEDGER_RECONCILE: "gold_ledger:reconcile",
  CASH_VIEW: "cash:view",
  CASH_MANAGE: "cash:manage",
  CASH_RECONCILE: "cash:reconcile",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const OWNER_ROLE_NAME = "OWNER";
export const ADMIN_ROLE_NAME = "ADMIN";

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}
