import { z } from "zod";
import { EXPENSE_INCOME_PAYMENT_METHODS, INCOME_TYPES, FINANCIAL_ENTRY_STATUSES } from "@/types/accounting";
import { REPORT_DATE_PRESETS } from "@/lib/report-date-range";
import { GOLD_PURITIES } from "@/types/gold";
import { PURCHASE_PAYMENT_STATUSES } from "@/types/purchases";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

// ---------------------------------------------------------------------------
// Expense categories
// ---------------------------------------------------------------------------

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(120),
  description: optionalText(500),
});

export const setExpenseCategoryActiveSchema = z.object({
  id: z.uuid(),
  isActive: z.boolean(),
});

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export const createExpenseSchema = z.object({
  categoryId: z.uuid("Select a category."),
  description: z.string().trim().min(1, "Description is required.").max(500),
  amount: z.coerce.number().finite().positive("Amount must be greater than zero."),
  paymentMethod: z.enum(EXPENSE_INCOME_PAYMENT_METHODS),
  expenseDate: z.coerce.date(),
  reference: optionalText(120),
  vendorName: optionalText(160),
  notes: optionalText(1000),
  reversalOfId: z.uuid().optional(),
});

export const voidExpenseSchema = z.object({
  expenseId: z.uuid(),
  reason: z.string().trim().min(1, "A reason is required.").max(500),
});

export const expenseListFilterSchema = z.object({
  categoryId: z.uuid().optional(),
  paymentMethod: z.enum(EXPENSE_INCOME_PAYMENT_METHODS).optional(),
  status: z.enum(FINANCIAL_ENTRY_STATUSES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Income
// ---------------------------------------------------------------------------

export const createIncomeSchema = z.object({
  incomeType: z.enum(INCOME_TYPES),
  description: z.string().trim().min(1, "Description is required.").max(500),
  amount: z.coerce.number().finite().positive("Amount must be greater than zero."),
  paymentMethod: z.enum(EXPENSE_INCOME_PAYMENT_METHODS),
  incomeDate: z.coerce.date(),
  reference: optionalText(120),
  notes: optionalText(1000),
  reversalOfId: z.uuid().optional(),
});

export const voidIncomeSchema = z.object({
  incomeId: z.uuid(),
  reason: z.string().trim().min(1, "A reason is required.").max(500),
});

export const incomeListFilterSchema = z.object({
  incomeType: z.enum(INCOME_TYPES).optional(),
  status: z.enum(FINANCIAL_ENTRY_STATUSES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Daily closing
// ---------------------------------------------------------------------------

export const submitDailyClosingSchema = z.object({
  businessDate: z.coerce.date(),
  physicalCashAmount: z.coerce.number().finite().min(0, "Physical cash cannot be negative."),
  notes: optionalText(1000),
});

export const confirmDailyClosingSchema = z.object({
  businessDate: z.coerce.date(),
});

export const reopenDailyClosingSchema = z.object({
  businessDate: z.coerce.date(),
  reason: z.string().trim().min(1, "A reason is required.").max(500),
});

// ---------------------------------------------------------------------------
// Report date range (shared by every report/export action)
// ---------------------------------------------------------------------------

export const reportDateRangeSchema = z.object({
  preset: z.enum(REPORT_DATE_PRESETS),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const salesReportFilterSchema = reportDateRangeSchema.extend({
  cashierId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "CREDIT", "OTHER"]).optional(),
});

export const purchaseReportFilterSchema = reportDateRangeSchema.extend({
  supplierId: z.uuid().optional(),
  categoryId: z.uuid().optional(),
  purity: z.enum(GOLD_PURITIES).optional(),
  paymentStatus: z.enum(PURCHASE_PAYMENT_STATUSES).optional(),
});
