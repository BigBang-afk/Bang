import { z } from "zod";
import { GOLD_PURITIES } from "@/lib/constants";

export const goldRateUpdateSchema = z.object({
  purity: z.enum(GOLD_PURITIES),
  // Admin enters ONE of these; the server derives the other two.
  input_mode: z.enum(["per_tola", "per_gram"]),
  rate_per_tola: z.coerce.number().min(0).optional(),
  rate_per_gram: z.coerce.number().min(0).optional(),
  rate_source: z.string().trim().min(1).max(100).default("Manual"),
  is_manual_override: z.boolean().default(false),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (data.input_mode === "per_tola" && (data.rate_per_tola === undefined || data.rate_per_tola <= 0)) {
    ctx.addIssue({ code: "custom", path: ["rate_per_tola"], message: "Enter a rate per tola greater than zero" });
  }
  if (data.input_mode === "per_gram" && (data.rate_per_gram === undefined || data.rate_per_gram <= 0)) {
    ctx.addIssue({ code: "custom", path: ["rate_per_gram"], message: "Enter a rate per gram greater than zero" });
  }
});
export type GoldRateUpdateInput = z.infer<typeof goldRateUpdateSchema>;

/** Base-24K entry that auto-derives 22K/21K/18K (still individually overridable after). */
export const baseGoldRateSchema = z.object({
  rate_24k_per_tola: z.coerce.number().positive("Enter a valid 24K rate per tola"),
  rate_source: z.string().trim().min(1).max(100).default("Manual"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type BaseGoldRateInput = z.infer<typeof baseGoldRateSchema>;
