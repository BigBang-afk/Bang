import { z } from "zod";
import { DISCOUNT_TYPES, GOLD_PURITIES, PRICING_METHODS, AVAILABILITY_STATUSES } from "@/lib/constants";

export const productSchema = z
  .object({
    product_code: z
      .string()
      .trim()
      .min(1, "Product code is required")
      .max(40)
      .regex(/^[A-Z0-9-]+$/, "Use uppercase letters, numbers and hyphens only"),
    name: z.string().trim().min(2, "Product name is required").max(150),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(160)
      .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens"),
    description: z.string().trim().max(4000).optional().or(z.literal("")),
    category_id: z.string().uuid().nullable().optional(),
    purity: z.enum(GOLD_PURITIES),
    gross_weight_grams: z.coerce
      .number({ message: "Gross weight must be a number" })
      .refine((v) => Number.isFinite(v), "Gross weight must be a valid number")
      .refine((v) => v >= 0, "Gross weight cannot be negative"),
    pricing_method: z.enum(PRICING_METHODS),
    fixed_price: z.coerce.number().min(0).nullable().optional(),
    discount_type: z.enum(DISCOUNT_TYPES).default("none"),
    discount_value: z.coerce.number().min(0).default(0),
    availability_status: z.enum(AVAILABILITY_STATUSES).default("in_stock"),
    gender: z.enum(["women", "men", "kids", "unisex"]).default("women"),
    is_bridal: z.boolean().default(false),
    is_featured: z.boolean().default(false),
    is_new_arrival: z.boolean().default(false),
    is_active: z.boolean().default(true),
    is_draft: z.boolean().default(false),
    cover_image_url: z.string().url().nullable().optional(),
    seo_title: z.string().trim().max(70).optional().or(z.literal("")),
    seo_description: z.string().trim().max(160).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.pricing_method === "automatic" && data.gross_weight_grams <= 0) {
      ctx.addIssue({
        code: "custom",
        path: ["gross_weight_grams"],
        message: "Gross weight must be greater than zero for automatic pricing",
      });
    }
    if (data.pricing_method === "fixed" && (data.fixed_price === null || data.fixed_price === undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["fixed_price"],
        message: "Fixed price is required for the Fixed Price pricing method",
      });
    }
    if (data.discount_type === "percentage" && data.discount_value > 100) {
      ctx.addIssue({
        code: "custom",
        path: ["discount_value"],
        message: "Percentage discount cannot exceed 100%",
      });
    }
  });

export type ProductInput = z.infer<typeof productSchema>;

const taxonomyBaseSchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  image_url: z.string().url().nullable().optional(),
  seo_title: z.string().trim().max(70).optional().or(z.literal("")),
  seo_description: z.string().trim().max(160).optional().or(z.literal("")),
  display_order: z.coerce.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const categorySchema = taxonomyBaseSchema.extend({
  code: z
    .string()
    .trim()
    .min(2, "Code must be 2-6 characters")
    .max(6, "Code must be 2-6 characters")
    .regex(/^[A-Z0-9]+$/, "Use uppercase letters and numbers only")
    .transform((v) => v.toUpperCase()),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const collectionSchema = taxonomyBaseSchema;
export type CollectionInput = z.infer<typeof collectionSchema>;
