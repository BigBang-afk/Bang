export const EXPENSE_INCOME_PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;
export type ExpenseIncomePaymentMethodValue = (typeof EXPENSE_INCOME_PAYMENT_METHODS)[number];

export const INCOME_TYPES = ["OTHER_INCOME", "SERVICE_INCOME", "MISC_INCOME"] as const;
export type IncomeTypeValue = (typeof INCOME_TYPES)[number];

export const INCOME_TYPE_LABELS: Record<IncomeTypeValue, string> = {
  OTHER_INCOME: "Other Income",
  SERVICE_INCOME: "Service Income",
  MISC_INCOME: "Misc Income",
};

export const FINANCIAL_ENTRY_STATUSES = ["ACTIVE", "VOIDED"] as const;
export type FinancialEntryStatusValue = (typeof FINANCIAL_ENTRY_STATUSES)[number];
