import { z } from "zod";
import { GOLD_PURITIES, WASTAGE_TYPES } from "@/types/gold";
import { PURCHASE_PAYMENT_METHODS } from "@/types/purchases";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const purchaseItemSchema = z
  .object({
    productName: z.string().trim().min(1, "Product name is required.").max(200),
    categoryId: z.uuid().optional().or(z.literal("").transform(() => undefined)),
    purity: z.enum(GOLD_PURITIES),
    netWeight: z.coerce.number().finite().positive("Net weight must be greater than zero."),
    goldRate: z.coerce.number().finite().positive("Gold rate must be greater than zero."),
    wastageType: z.enum(WASTAGE_TYPES),
    wastagePercent: z.coerce.number().finite().min(0).max(100).optional(),
    wastageGrams: z.coerce.number().finite().min(0).optional(),
    makingCharge: z.coerce.number().finite().min(0).optional(),
    stoneCharge: z.coerce.number().finite().min(0).optional(),
    diamondCharge: z.coerce.number().finite().min(0).optional(),
    otherCharge: z.coerce.number().finite().min(0).optional(),
    notes: optionalText(1000),
    addToInventory: z.boolean(),
    sellingPrice: z.coerce.number().finite().positive().optional(),
  })
  .refine((v) => !v.addToInventory || v.sellingPrice !== undefined, {
    message: "A selling price is required to add this item to inventory.",
    path: ["sellingPrice"],
  });

export const purchasePaymentSchema = z.object({
  amount: z.coerce.number().finite().positive("Payment amount must be greater than zero."),
  method: z.enum(PURCHASE_PAYMENT_METHODS),
  reference: optionalText(200),
  notes: optionalText(500),
});

export const createPurchaseSchema = z.object({
  supplierId: z.uuid(),
  purchaseDate: z.iso.date().optional(),
  referenceNumber: optionalText(120),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item."),
  payments: z.array(purchasePaymentSchema).default([]),
  notes: optionalText(2000),
});

export const purchaseListFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  supplierId: z.uuid().optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  paymentStatus: z.enum(["UNPAID", "PARTIALLY_PAID", "PAID"]).optional(),
  sort: z.enum(["NEWEST", "OLDEST", "AMOUNT_HIGH", "BALANCE_HIGH"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
