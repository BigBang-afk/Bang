/**
 * SystemSetting keys used outside Phase 1's business.name/business.currency
 * pair. Centralized so the seed script and every reader agree on the exact
 * string — never hardcode one of these keys inline.
 */
export const SETTINGS_KEYS = {
  BUSINESS_NAME: "business.name",
  BUSINESS_CURRENCY: "business.currency",
  BUSINESS_ADDRESS: "business.address",
  BUSINESS_PHONE: "business.phone",
  TAX_ENABLED: "tax.enabled",
  TAX_PERCENT: "tax.percent",
  INVOICE_FOOTER_TEXT: "invoice.footer_text",
} as const;

/** Per-role maximum discount percentage: "discount.max_percent.<ROLE_NAME>". */
export function discountLimitKey(roleName: string): string {
  return `discount.max_percent.${roleName}`;
}
