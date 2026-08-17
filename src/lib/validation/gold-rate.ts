import { z } from "zod";

const rateValue = z.coerce
  .number({ error: "Enter a valid rate." })
  .finite("Enter a valid rate.")
  .positive("Rate must be greater than zero.")
  .max(100_000_000, "Rate is unrealistically large.");

export const setGoldRatesSchema = z.object({
  k24: rateValue,
  k22: rateValue,
  k21: rateValue,
  k18: rateValue,
  silver: rateValue.optional(),
});

export type SetGoldRatesInput = z.infer<typeof setGoldRatesSchema>;

export const goldRateHistoryFilterSchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});

export type GoldRateHistoryFilter = z.infer<typeof goldRateHistoryFilterSchema>;
