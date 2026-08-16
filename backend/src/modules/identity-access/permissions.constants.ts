/**
 * The full Zarghoon permission catalog. Codes for modules that don't exist
 * yet (products, inventory, sales, customers, finance, marketing) are
 * seeded now as inert catalog entries so:
 *   1. roles can be modeled realistically today (a CASHIER role means
 *      nothing without sales.* permissions to grant it), and
 *   2. later phases only need to add guards referencing these codes, never
 *      invent a second authorization mechanism.
 * Only the `identity` module's codes are actually enforced by a guard in
 * Phase 1 — the rest have no endpoints behind them yet.
 */
export const PERMISSIONS = {
  // identity — enforced now
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DISABLE: 'users.disable',
  ROLES_READ: 'roles.read',
  ROLES_MANAGE: 'roles.manage',
  PERMISSIONS_READ: 'permissions.read',
  BRANCHES_READ: 'branches.read',
  BRANCHES_MANAGE: 'branches.manage',
  AUDIT_READ: 'audit.read',
  SETTINGS_MANAGE: 'settings.manage',

  // future modules — catalog only, not enforced yet
  PRODUCTS_READ: 'products.read',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  INVENTORY_READ: 'inventory.read',
  INVENTORY_ADJUST: 'inventory.adjust',
  SALES_READ: 'sales.read',
  SALES_CREATE: 'sales.create',
  SALES_REVERSE: 'sales.reverse',
  CUSTOMERS_READ: 'customers.read',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  FINANCE_READ: 'finance.read',
  FINANCE_MANAGE: 'finance.manage',
  REPORTS_READ: 'reports.read',
  MARKETING_READ: 'marketing.read',
  MARKETING_MANAGE: 'marketing.manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSION_CODES: PermissionCode[] = Object.values(PERMISSIONS);

/** Permission codes that belong to modules built in this phase. */
export const IDENTITY_PERMISSION_CODES: PermissionCode[] = [
  PERMISSIONS.USERS_READ,
  PERMISSIONS.USERS_CREATE,
  PERMISSIONS.USERS_UPDATE,
  PERMISSIONS.USERS_DISABLE,
  PERMISSIONS.ROLES_READ,
  PERMISSIONS.ROLES_MANAGE,
  PERMISSIONS.PERMISSIONS_READ,
  PERMISSIONS.BRANCHES_READ,
  PERMISSIONS.BRANCHES_MANAGE,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.SETTINGS_MANAGE,
];
