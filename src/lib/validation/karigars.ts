import { z } from "zod";
import { GOLD_PURITIES } from "@/types/gold";
import { KARIGAR_SPECIALIZATIONS, KARIGAR_STATUSES, KARIGAR_LIST_SORTS } from "@/types/karigars";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const phoneField = z
  .string()
  .trim()
  .min(6, "Enter a valid phone number.")
  .max(30, "Enter a valid phone number.")
  .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number.");

const optionalPhoneField = phoneField.optional().or(z.literal("").transform(() => undefined));

const karigarFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  phone: phoneField,
  secondaryPhone: optionalPhoneField,
  address: optionalText(500),
  city: optionalText(120),
  specialization: z.enum(KARIGAR_SPECIALIZATIONS).optional(),
  notes: optionalText(2000),
});

export const createKarigarSchema = karigarFieldsSchema;
export const updateKarigarSchema = karigarFieldsSchema
  .required({ specialization: true })
  .and(z.object({ id: z.uuid() }));

export const changeKarigarStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(KARIGAR_STATUSES),
});

export const karigarListFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  specialization: z.enum(KARIGAR_SPECIALIZATIONS).optional(),
  status: z.enum(KARIGAR_STATUSES).optional(),
  sort: z.enum(KARIGAR_LIST_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const giveGoldToKarigarSchema = z.object({
  karigarId: z.uuid(),
  purity: z.enum(GOLD_PURITIES),
  weight: z.coerce.number().finite().positive("Weight must be greater than zero."),
  goldRate: z.coerce.number().finite().positive("Gold rate must be greater than zero."),
  purpose: optionalText(200),
  jobReference: optionalText(120),
  expectedWeight: z.coerce.number().finite().positive().optional(),
  notes: optionalText(1000),
});

export const receiveGoldFromKarigarSchema = z.object({
  jobId: z.uuid(),
  receivedWeight: z.coerce.number().finite().min(0, "Received weight cannot be negative."),
  expectedWeight: z.coerce.number().finite().positive().optional(),
  notes: optionalText(1000),
});

export const classifyGoldJobDifferenceSchema = z.object({
  jobId: z.uuid(),
  classification: z.string().trim().min(1, "Enter a classification.").max(200),
});

export const recordKarigarCashTransactionSchema = z.object({
  karigarId: z.uuid(),
  transactionType: z.enum(["CASH_PAID", "CASH_RECEIVED"]),
  amount: z.coerce.number().finite().positive("Amount must be greater than zero."),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  description: optionalText(300),
});
