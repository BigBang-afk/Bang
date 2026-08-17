export const CUSTOMER_TYPES = ["REGULAR", "VIP", "WHOLESALE", "CORPORATE"] as const;
export type CustomerTypeValue = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerTypeValue, string> = {
  REGULAR: "Regular",
  VIP: "VIP",
  WHOLESALE: "Wholesale",
  CORPORATE: "Corporate",
};

/** An ACCOUNT status — distinct from the computed "Inactive Customers"
 * marketing segment. See CUSTOMER-SEGMENTS.md. */
export const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;
export type CustomerStatusValue = (typeof CUSTOMER_STATUSES)[number];

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatusValue, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

export const LEDGER_TRANSACTION_TYPES = [
  "SALE",
  "PAYMENT",
  "REFUND",
  "CREDIT_ADJUSTMENT",
  "DEBIT_ADJUSTMENT",
] as const;
export type LedgerTransactionTypeValue = (typeof LEDGER_TRANSACTION_TYPES)[number];

export const LEDGER_TRANSACTION_TYPE_LABELS: Record<LedgerTransactionTypeValue, string> = {
  SALE: "Sale",
  PAYMENT: "Payment",
  REFUND: "Refund",
  CREDIT_ADJUSTMENT: "Credit Adjustment",
  DEBIT_ADJUSTMENT: "Debit Adjustment",
};

/** CREDIT is not a valid method for receiving a customer payment — you
 * cannot "receive a credit payment". See CUSTOMER-LEDGER.md. */
export const CUSTOMER_PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;
export type CustomerPaymentMethodValue = (typeof CUSTOMER_PAYMENT_METHODS)[number];

export const CUSTOMER_LIST_SORTS = [
  "NEWEST",
  "OLDEST",
  "SPENDING_HIGH",
  "OUTSTANDING_HIGH",
  "MOST_PURCHASES",
  "RECENT_PURCHASE",
] as const;
export type CustomerListSortValue = (typeof CUSTOMER_LIST_SORTS)[number];
