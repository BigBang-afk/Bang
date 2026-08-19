import { z } from "zod";

export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^\+?[0-9]{7,15}$/.test(v), {
    message: "Enter a valid mobile number (7–15 digits, optional +country code).",
  });

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.");

export const customerRegisterSchema = z
  .object({
    fullName: z.string().trim().min(2, "Full name is required.").max(120),
    mobile: mobileSchema,
    dob: z.coerce.date({ error: "A valid date of birth is required." }),
    email: z.string().trim().toLowerCase().email().optional().or(z.literal("")).optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
    marketingConsent: z.boolean().optional().default(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.dob <= new Date(), {
    message: "Date of birth cannot be in the future.",
    path: ["dob"],
  });

export const customerLoginSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your mobile number or email."),
  password: z.string().min(1, "Password is required."),
});

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
  remember: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const goldPuritySchema = z.enum(["K24", "K21", "K18"]);

export const goldRateInputSchema = z.object({
  purity: goldPuritySchema,
  ratePerGram: z.coerce.number().positive("Rate must be greater than 0."),
  effectiveAt: z.coerce.date().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens.")
    .optional(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  parentId: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().max(60).optional(),
  categoryId: z.string().min(1, "Category is required."),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  purity: goldPuritySchema,
  grossWeight: z.coerce.number().positive("Gross weight must be greater than 0."),
  netGoldWeight: z.coerce.number().nonnegative(),
  stoneWeight: z.coerce.number().nonnegative().optional().default(0),
  makingCharges: z.coerce.number().nonnegative().optional().default(0),
  stoneCharges: z.coerce.number().nonnegative().optional().default(0),
  otherCharges: z.coerce.number().nonnegative().optional().default(0),
  discount: z.coerce.number().nonnegative().optional().default(0),
  taxPercent: z.coerce.number().min(0).max(100).optional().default(0),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional().default("DRAFT"),
  isFeatured: z.boolean().optional().default(false),
  isNewArrival: z.boolean().optional().default(false),
  isBestseller: z.boolean().optional().default(false),
  stockStatus: z.enum(["IN_STOCK", "OUT_OF_STOCK", "MADE_TO_ORDER"]).optional().default("IN_STOCK"),
});

export const messageTemplateSchema = z.object({
  name: z.string().trim().min(2).max(150),
  type: z.enum([
    "BIRTHDAY",
    "NEW_COLLECTION",
    "GOLD_RATE_UPDATE",
    "SPECIAL_OFFER",
    "FESTIVAL",
    "ANNOUNCEMENT",
    "CUSTOM",
  ]),
  channel: z.enum(["SMS", "WHATSAPP"]).optional().default("SMS"),
  body: z.string().trim().min(1).max(1000),
  isActive: z.boolean().optional().default(true),
});

export const campaignSchema = z.object({
  name: z.string().trim().min(2).max(150),
  templateId: z.string().optional().nullable(),
  channel: z.enum(["SMS", "WHATSAPP"]).optional().default("SMS"),
  body: z.string().trim().min(1).max(1000),
  groupKey: z.string(), // "all" | "new" | "vip" | "birthday_today" | ... | customerGroupId | explicit customerIds
  customerIds: z.array(z.string()).optional(),
});

export const orderInquirySchema = z.object({
  customerId: z.string().optional().nullable(),
  guestName: z.string().trim().min(2).max(120).optional(),
  guestMobile: mobileSchema.optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.coerce.number().int().positive().optional().default(1),
      }),
    )
    .min(1, "At least one product is required."),
});

export const gallerySchema = z.object({
  title: z.string().trim().max(150).optional(),
  category: z.enum(["SHOWROOM", "JEWELLERY", "EVENTS", "BRIDAL", "CUSTOMERS", "COLLECTIONS"]),
  imageUrl: z.string().min(1),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional().default(true),
});
