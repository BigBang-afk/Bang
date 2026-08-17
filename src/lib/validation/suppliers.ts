import { z } from "zod";
import { SUPPLIER_STATUSES, SUPPLIER_LIST_SORTS } from "@/types/suppliers";

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

const emailField = z
  .string()
  .trim()
  .max(200)
  .optional()
  .or(z.literal("").transform(() => undefined))
  .refine((v) => v === undefined || z.email().safeParse(v).success, "Enter a valid email address.");

const supplierFieldsSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(160),
  companyName: optionalText(200),
  phone: phoneField,
  secondaryPhone: optionalPhoneField,
  email: emailField,
  address: optionalText(500),
  city: optionalText(120),
  notes: optionalText(2000),
});

export const createSupplierSchema = supplierFieldsSchema;
export const updateSupplierSchema = supplierFieldsSchema.and(z.object({ id: z.uuid() }));

export const changeSupplierStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(SUPPLIER_STATUSES),
});

export const supplierListFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(SUPPLIER_STATUSES).optional(),
  sort: z.enum(SUPPLIER_LIST_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.uuid(),
  amount: z.coerce.number().finite().positive("Payment amount must be greater than zero."),
  method: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  reference: optionalText(200),
  notes: optionalText(500),
});
