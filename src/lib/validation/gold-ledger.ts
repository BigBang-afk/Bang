import { z } from "zod";
import { GOLD_PURITIES } from "@/types/gold";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const goldReconciliationSchema = z.object({
  purity: z.enum(GOLD_PURITIES),
  physicalWeight: z.coerce.number().finite().min(0, "Physical weight cannot be negative."),
  notes: optionalText(1000),
});

export const goldAdjustmentSchema = z.object({
  partyType: z.enum(["KARIGAR", "SUPPLIER"]),
  partyId: z.uuid(),
  purity: z.enum(GOLD_PURITIES),
  direction: z.enum(["debit", "credit"]),
  weight: z.coerce.number().finite().positive("Weight must be greater than zero."),
  description: z.string().trim().min(1, "A description is required.").max(300),
});

export const goldLedgerFilterSchema = z.object({
  partyType: z.enum(["KARIGAR", "SUPPLIER"]).optional(),
  purity: z.enum(GOLD_PURITIES).optional(),
  transactionType: z
    .enum(["GOLD_GIVEN", "GOLD_RECEIVED", "GOLD_ADJUSTMENT", "GOLD_RETURNED", "GOLD_TRANSFER"])
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
});
