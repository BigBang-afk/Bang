import { z } from "zod";
import { PAYMENT_METHODS, SALE_STATUSES, PAYMENT_STATUSES } from "@/types/sales";

export const barcodeLookupSchema = z.object({
  code: z.string().trim().min(1, "Enter or scan a barcode."),
});

export const posSearchSchema = z.object({
  query: z.string().trim().min(1).max(200),
});

const discountTypeField = z.enum(["PERCENTAGE", "FIXED"]).nullable().optional();

export const saleCartItemSchema = z.object({
  inventoryItemId: z.uuid(),
  discountType: discountTypeField,
  discountValue: z.coerce.number().finite().min(0).nullable().optional(),
});

export const salePaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: z.coerce.number().finite().positive("Payment amount must be greater than zero."),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const completeSaleSchema = z.object({
  items: z.array(saleCartItemSchema).min(1, "The cart is empty."),
  customerId: z.uuid().nullable().optional(),
  payments: z.array(salePaymentSchema).min(1, "At least one payment is required."),
  clientRequestId: z.string().trim().max(100).optional(),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Customer name is required.").max(200),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number.")
    .max(30, "Enter a valid phone number.")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number."),
  email: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined))
    .refine((v) => v === undefined || z.email().safeParse(v).success, "Enter a valid email address."),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const customerSearchSchema = z.object({
  query: z.string().trim().min(1).max(200),
});

export const requestReturnSchema = z.object({
  saleItemId: z.uuid(),
  reason: z.string().trim().min(1, "A reason is required.").max(1000),
});

export const approveReturnSchema = z.object({
  returnId: z.uuid(),
  notes: z.string().trim().max(1000).optional(),
});

export const saleListFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  status: z.enum(SALE_STATUSES).optional(),
  customerId: z.uuid().optional(),
  createdById: z.uuid().optional(),
  sort: z.enum(["NEWEST", "OLDEST", "VALUE_HIGH", "VALUE_LOW"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
