import { z } from "zod";
import { GOLD_PURITIES, WASTAGE_TYPES } from "@/types/gold";
import { STOCK_STATUSES, INVENTORY_SORT_OPTIONS } from "@/types/inventory";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

const nonNegativeMoney = z.coerce.number({ error: "Enter a valid amount." }).finite().min(0);
const positiveMoney = z.coerce
  .number({ error: "Enter a valid amount." })
  .finite()
  .positive("Must be greater than zero.");
const positiveWeight = z.coerce
  .number({ error: "Enter a valid weight." })
  .finite()
  .positive("Must be greater than zero.");

export const inventoryItemFieldsSchema = z
  .object({
    productName: z.string().trim().min(1, "Product name is required.").max(200),
    categoryId: z.uuid("Select a category."),
    subcategory: optionalText(120),
    designNumber: optionalText(120),
    supplier: optionalText(200),
    karigar: optionalText(200),
    notes: optionalText(2000),

    purity: z.enum(GOLD_PURITIES),
    netWeight: positiveWeight,
    goldRate: positiveMoney,
    wastageType: z.enum(WASTAGE_TYPES),
    wastagePercent: z.coerce
      .number()
      .finite()
      .min(0, "Must be between 0 and 100.")
      .max(100, "Must be between 0 and 100.")
      .optional(),
    wastageGrams: z.coerce.number().finite().min(0, "Cannot be negative.").optional(),

    makingCharge: nonNegativeMoney.optional(),
    stoneCharge: nonNegativeMoney.optional(),
    diamondCharge: nonNegativeMoney.optional(),
    otherCharge: nonNegativeMoney.optional(),
    sellingPrice: positiveMoney,
    confirmLowerPrice: z.coerce.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.wastageType === "PERCENTAGE" && data.wastagePercent === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["wastagePercent"],
        message: "Wastage percentage is required.",
      });
    }
    if (data.wastageType === "FIXED_GRAMS" && data.wastageGrams === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["wastageGrams"],
        message: "Wastage weight is required.",
      });
    }
  });

export const createInventoryItemSchema = inventoryItemFieldsSchema;
export type CreateInventoryItemFields = z.infer<typeof createInventoryItemSchema>;

export const updateInventoryItemSchema = inventoryItemFieldsSchema.and(
  z.object({
    id: z.uuid(),
    removeImage: z.coerce.boolean().optional(),
  }),
);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(120),
  description: optionalText(500),
});

export const changeStatusSchema = z.object({
  id: z.uuid(),
  newStatus: z.enum(STOCK_STATUSES),
  notes: optionalText(1000),
});

export const inventoryFilterSchema = z.object({
  search: z.string().trim().max(200).optional(),
  categoryId: z.uuid().optional(),
  purity: z.enum(GOLD_PURITIES).optional(),
  status: z.enum(STOCK_STATUSES).optional(),
  supplier: z.string().trim().max(200).optional(),
  karigar: z.string().trim().max(200).optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  minWeight: z.coerce.number().finite().min(0).optional(),
  maxWeight: z.coerce.number().finite().min(0).optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  sort: z.enum(INVENTORY_SORT_OPTIONS).optional(),
  page: z.coerce.number().int().min(1).optional(),
});
