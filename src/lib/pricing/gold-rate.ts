import { GRAMS_PER_TOLA, PURITY_FACTOR, type GoldPurity } from "@/lib/constants";

export interface DerivedRate {
  ratePerTola: number;
  ratePer10Grams: number;
  ratePerGram: number;
}

/** Round money consistently to 2 decimal places (banker's rounding avoided; simple half-up is fine for PKR display). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function tolaToGramRate(ratePerTola: number): number {
  return ratePerTola / GRAMS_PER_TOLA;
}

export function gramToTolaRate(ratePerGram: number): number {
  return ratePerGram * GRAMS_PER_TOLA;
}

/** Given a rate per tola, derive the per-gram and per-10-gram equivalents. */
export function deriveFromPerTola(ratePerTola: number): DerivedRate {
  const ratePerGram = roundMoney(tolaToGramRate(ratePerTola));
  return {
    ratePerTola: roundMoney(ratePerTola),
    ratePer10Grams: roundMoney(ratePerGram * 10),
    ratePerGram,
  };
}

/** Given a rate per gram, derive the per-tola and per-10-gram equivalents. */
export function deriveFromPerGram(ratePerGram: number): DerivedRate {
  return {
    ratePerTola: roundMoney(gramToTolaRate(ratePerGram)),
    ratePer10Grams: roundMoney(ratePerGram * 10),
    ratePerGram: roundMoney(ratePerGram),
  };
}

/**
 * Given a base 24K rate per tola, derive the 22K/21K/18K rates per tola
 * using the standard purity ratio (e.g. 22K = 24K × 22/24).
 */
export function derivePurityRatesFromBase24k(base24kPerTola: number): Record<GoldPurity, number> {
  return {
    "24K": roundMoney(base24kPerTola * PURITY_FACTOR["24K"]),
    "22K": roundMoney(base24kPerTola * PURITY_FACTOR["22K"]),
    "21K": roundMoney(base24kPerTola * PURITY_FACTOR["21K"]),
    "18K": roundMoney(base24kPerTola * PURITY_FACTOR["18K"]),
  };
}

export function rateChange(current: number, previous: number | null): { change: number; percentage: number } {
  if (previous === null || previous === 0) return { change: 0, percentage: 0 };
  const change = roundMoney(current - previous);
  const percentage = roundMoney((change / previous) * 100);
  return { change, percentage };
}
