export const GOLD_PURITIES = ["K24", "K22", "K21", "K18", "SILVER"] as const;
export type GoldPurity = (typeof GOLD_PURITIES)[number];

export const PURITY_LABELS: Record<GoldPurity, string> = {
  K24: "24K Gold",
  K22: "22K Gold",
  K21: "21K Gold",
  K18: "18K Gold",
  SILVER: "Silver",
};

export const WASTAGE_TYPES = ["PERCENTAGE", "FIXED_GRAMS"] as const;
export type WastageType = (typeof WASTAGE_TYPES)[number];

/**
 * MODE_A: Gross Weight x Gold Rate
 * MODE_B: (Net Weight + Wastage) x Gold Rate  — equivalent to MODE_A, kept
 *         distinct so callers can express intent explicitly.
 * MODE_C: Net Weight x Gold Rate + Making Charges
 */
export const PRICING_MODES = ["MODE_A", "MODE_B", "MODE_C"] as const;
export type PricingMode = (typeof PRICING_MODES)[number];

/** Plain-serializable rate shape safe to pass from Server to Client Components. */
export type SimpleGoldRate = {
  purity: GoldPurity;
  ratePerGram: string;
};
