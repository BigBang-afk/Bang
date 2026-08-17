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
  /** Maximum marketing messages one customer may receive in a calendar day, across all campaigns. See CAMPAIGN-SYSTEM.md "Frequency control". */
  MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_DAY: "marketing.max_messages_per_customer_per_day",
  /** Maximum marketing messages one customer may receive in a rolling 7-day window. */
  MARKETING_MAX_MESSAGES_PER_CUSTOMER_PER_WEEK: "marketing.max_messages_per_customer_per_week",
  /** Minimum hours between two campaigns targeting the same customer. */
  MARKETING_MIN_CAMPAIGN_GAP_HOURS: "marketing.min_campaign_gap_hours",
  /** How many messages the mock/real marketing provider may be asked to send per minute — see CAMPAIGN-SYSTEM.md "Rate limiting". */
  MARKETING_RATE_LIMIT_PER_MINUTE: "marketing.rate_limit_per_minute",
  /** How many messages per hour, across all campaigns. */
  MARKETING_RATE_LIMIT_PER_HOUR: "marketing.rate_limit_per_hour",
  /** Maximum automatic retry attempts for a temporarily-failed message before it's left FAILED. */
  MARKETING_MAX_RETRIES: "marketing.max_retries",
  /** Days after a campaign message is sent within which a purchase may be attributed to it. See CAMPAIGN-SYSTEM.md "Attribution". */
  MARKETING_ATTRIBUTION_WINDOW_DAYS: "marketing.attribution_window_days",
  /** The lookback window (days) RFM Frequency/Monetary figures are computed over. See CUSTOMER-SCORING.md. */
  MARKETING_RFM_PERIOD_DAYS: "marketing.rfm_period_days",
  /** JSON object of the four Business Engagement Score component weights, e.g. {"recency":25,"frequency":25,"monetary":25,"engagement":25} — must sum to 100. See CUSTOMER-SCORING.md. */
  MARKETING_ENGAGEMENT_SCORE_WEIGHTS: "marketing.engagement_score_weights",
  /** Below this many in-stock pieces in a category, the category is flagged LOW_STOCK — see ALERT-SYSTEM.md "Low stock rule". Unique jewelry has no per-SKU reorder point, so this is a category-count threshold, not a per-product one. */
  BI_LOW_STOCK_CATEGORY_THRESHOLD: "bi.low_stock_category_threshold",
  /** Days an inventory item may sit with no recorded sale before it's flagged AGING_STOCK / surfaced as slow-moving. See ANALYTICS.md "Inventory age". */
  BI_AGING_STOCK_DAYS: "bi.aging_stock_days",
  /** A cash-shortage alert fires when Daily Closing's (physical − expected) difference is a shortfall of at least this many rupees. See ALERT-SYSTEM.md. */
  BI_CASH_SHORTAGE_THRESHOLD: "bi.cash_shortage_threshold",
  /** Outstanding balance above which a single customer/supplier triggers a HIGH-receivable/payable alert. */
  BI_HIGH_BALANCE_THRESHOLD: "bi.high_balance_threshold",
  /** Percentage decline (current vs. previous comparable period) that triggers a SALES_DROP alert — see ALERT-SYSTEM.md "Sales drop alert". */
  BI_SALES_DROP_PERCENT: "bi.sales_drop_percent",
  /** Percentage above the historical average that triggers an EXPENSE_SPIKE alert — see ALERT-SYSTEM.md "Expense spike". */
  BI_EXPENSE_SPIKE_PERCENT: "bi.expense_spike_percent",
  /** A single discount/expense/refund/cash-adjustment at or above this rupee amount is flagged UNUSUAL_TRANSACTION for neutral human review — never an accusation. See ALERT-SYSTEM.md. */
  BI_UNUSUAL_TRANSACTION_AMOUNT: "bi.unusual_transaction_amount",
  /** Below this many days of completed-sales history, a sales/inventory forecast reports INSUFFICIENT_DATA instead of a number — see FORECASTING.md "Data sufficiency". */
  BI_FORECAST_MIN_DAYS_INSUFFICIENT: "bi.forecast_min_days_insufficient",
  /** Below this many days of history a forecast is LOW_CONFIDENCE; at or above it, STANDARD_CONFIDENCE. */
  BI_FORECAST_MIN_DAYS_STANDARD: "bi.forecast_min_days_standard",
} as const;

/** Per-role maximum discount percentage: "discount.max_percent.<ROLE_NAME>". */
export function discountLimitKey(roleName: string): string {
  return `discount.max_percent.${roleName}`;
}
