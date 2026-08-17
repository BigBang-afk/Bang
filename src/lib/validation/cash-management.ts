import { z } from "zod";

const paymentMethodEnum = z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const recordExpenseSchema = z.object({
  amount: z.coerce.number().finite().positive("Amount must be greater than zero."),
  paymentMethod: paymentMethodEnum,
  description: z.string().trim().min(1, "A description is required.").max(300),
});

export const recordCashAdjustmentSchema = z.object({
  amount: z.coerce.number().finite().positive("Amount must be greater than zero."),
  direction: z.enum(["IN", "OUT"]),
  paymentMethod: paymentMethodEnum,
  reason: z.string().trim().min(1, "A reason is required.").max(300),
});

export const cashReconciliationSchema = z.object({
  physicalAmount: z.coerce.number().finite().min(0, "Physical amount cannot be negative."),
  paymentMethod: paymentMethodEnum.optional(),
  notes: optionalText(1000),
});

export const partyCashAdjustmentSchema = z.object({
  partyType: z.enum(["KARIGAR", "SUPPLIER"]),
  partyId: z.uuid(),
  direction: z.enum(["debit", "credit"]),
  amount: z.coerce.number().finite().positive("Amount must be greater than zero."),
  description: z.string().trim().min(1, "A description is required.").max(300),
});

export const cashTransactionFilterSchema = z.object({
  transactionType: z
    .enum([
      "SALE_PAYMENT",
      "CUSTOMER_PAYMENT",
      "PURCHASE_PAYMENT",
      "SUPPLIER_PAYMENT",
      "KARIGAR_PAYMENT",
      "KARIGAR_RECEIPT",
      "EXPENSE",
      "CASH_ADJUSTMENT",
    ])
    .optional(),
  paymentMethod: paymentMethodEnum.optional(),
  page: z.coerce.number().int().min(1).optional(),
});
