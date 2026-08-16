import { z } from "zod";
import { GOLD_PURITIES } from "@/types/gold";
import {
  CUSTOMER_TYPES,
  CUSTOMER_STATUSES,
  CUSTOMER_LIST_SORTS,
  CUSTOMER_PAYMENT_METHODS,
} from "@/types/customers";

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

const dateField = z.iso.date().optional().or(z.literal("").transform(() => undefined));

const customerFieldsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(120),
  lastName: optionalText(120),
  phone: phoneField,
  secondaryPhone: optionalPhoneField,
  email: emailField,
  address: optionalText(500),
  city: optionalText(120),
  dateOfBirth: dateField,
  anniversaryDate: dateField,
  gender: optionalText(30),
  preferredLanguage: optionalText(60),
  notes: optionalText(2000),
});

export const createCustomerSchema = customerFieldsSchema.and(
  z.object({ customerType: z.enum(CUSTOMER_TYPES).optional() }),
);

export const updateCustomerSchema = customerFieldsSchema.and(z.object({ id: z.uuid() }));

export const duplicateCheckSchema = z.object({
  phone: phoneField,
  secondaryPhone: optionalPhoneField,
  email: emailField,
});

export const changeCustomerStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(CUSTOMER_STATUSES),
});

export const changeCustomerTypeSchema = z.object({
  id: z.uuid(),
  customerType: z.enum(CUSTOMER_TYPES),
});

export const customerListFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  customerType: z.enum(CUSTOMER_TYPES).optional(),
  status: z.enum(CUSTOMER_STATUSES).optional(),
  city: z.string().trim().max(120).optional(),
  minSpending: z.coerce.number().finite().min(0).optional(),
  maxSpending: z.coerce.number().finite().min(0).optional(),
  minOutstanding: z.coerce.number().finite().min(0).optional(),
  purchasedAfter: z.iso.date().optional(),
  purchasedBefore: z.iso.date().optional(),
  sort: z.enum(CUSTOMER_LIST_SORTS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});

export const addCustomerNoteSchema = z.object({
  customerId: z.uuid(),
  note: z.string().trim().min(1, "A note cannot be empty.").max(2000),
});

export const updateCustomerNoteSchema = z.object({
  id: z.uuid(),
  note: z.string().trim().min(1, "A note cannot be empty.").max(2000),
});

export const recordCustomerPaymentSchema = z.object({
  customerId: z.uuid(),
  amount: z.coerce.number().finite().positive("Payment amount must be greater than zero."),
  method: z.enum(CUSTOMER_PAYMENT_METHODS),
  reference: optionalText(200),
  notes: optionalText(500),
});

export const customerPreferenceSchema = z.object({
  customerId: z.uuid(),
  preferredCategories: z.array(z.string().trim().max(120)).max(20).optional(),
  preferredPurity: z.enum(GOLD_PURITIES).nullable().optional(),
  preferredMetal: optionalText(60),
  preferredPriceRangeMin: z.coerce.number().finite().min(0).optional(),
  preferredPriceRangeMax: z.coerce.number().finite().min(0).optional(),
  preferredContactMethod: optionalText(30),
  notes: optionalText(1000),
});
