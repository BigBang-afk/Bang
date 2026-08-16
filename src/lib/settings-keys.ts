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
  /** Total lifetime spending (completed sales only) at/above which a customer earns the VIP badge — see CUSTOMER-SEGMENTS.md. */
  VIP_SPENDING_THRESHOLD: "customer.vip_spending_threshold",
  /** Days since a customer's last completed purchase before they appear in the Inactive Customers segment. */
  CUSTOMER_INACTIVITY_DAYS: "customer.inactivity_days",
  /** Whether recordCustomerPayment() may accept an amount greater than the current outstanding balance. Off by default — see CUSTOMER-LEDGER.md. */
  CUSTOMER_OVERPAYMENT_ALLOWED: "customer.overpayment_allowed",
} as const;

/** Per-role maximum discount percentage: "discount.max_percent.<ROLE_NAME>". */
export function discountLimitKey(roleName: string): string {
  return `discount.max_percent.${roleName}`;
}
