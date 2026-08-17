import { z } from "zod";
import { WASTAGE_TYPES, PRICING_MODES } from "@/types/gold";

export const goldCalculationInputSchema = z.object({
  netWeight: z.coerce.number(),
  goldRate: z.coerce.number(),
  wastageType: z.enum(WASTAGE_TYPES),
  wastagePercent: z.coerce.number().optional(),
  wastageGrams: z.coerce.number().optional(),
  pricingMode: z.enum(PRICING_MODES).optional(),
  makingCharges: z.coerce.number().optional(),
});

export type GoldCalculationFormInput = z.infer<typeof goldCalculationInputSchema>;
