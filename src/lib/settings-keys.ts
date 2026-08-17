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
  /** Default acceptable difference (grams) between expected and received gold on a Karigar job before it's flagged EXCESS_DIFFERENCE/SHORTAGE — see KARIGAR-SYSTEM.md "Wastage reconciliation". */
  KARIGAR_WASTAGE_TOLERANCE_GRAMS: "karigar.wastage_tolerance_grams",
  /** The business's cash-in-hand at the moment Phase 5 cash tracking began — the base the running CashTransaction total is added to. See CASH-MANAGEMENT.md. */
  CASH_OPENING_BALANCE: "cash.opening_balance",
  /** IANA timezone used to resolve "today's business date" for Phase 6 daily closing and report date presets — see ACCOUNTING.md "Business date". Default "Asia/Karachi". Does NOT affect Phase 1's gold-rate business-date helper (src/lib/business-date.ts toBusinessDate/getTodayBusinessDate), which keeps its original server-local-day behavior unchanged. */
  BUSINESS_TIMEZONE: "business.timezone",
  /** Comma-separated day breakpoints for the Receivable Aging report's buckets, e.g. "30,60,90" produces Current / 1-30 / 31-60 / 61-90 / 90+. See FINANCIAL-REPORTS.md "Receivable aging". */
  RECEIVABLE_AGING_BUCKET_DAYS: "accounting.receivable_aging_bucket_days",
  /** Whether Daily Closing's unresolved-issues checklist flags any customer/supplier with an outstanding balance. Off by default — most days legitimately have open balances. See DAILY-CLOSING.md. */
  FLAG_UNPAID_BALANCES_ON_CLOSING: "accounting.flag_unpaid_balances_on_closing",
} as const;

/** Per-role maximum discount percentage: "discount.max_percent.<ROLE_NAME>". */
export function discountLimitKey(roleName: string): string {
  return `discount.max_percent.${roleName}`;
}
