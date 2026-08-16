import Decimal from "decimal.js";

/** Formats a weight in grams to exactly 3 decimal places, e.g. "10.500 g". */
export function formatWeight(value: Decimal.Value): string {
  const decimal = new Decimal(value);
  return `${decimal.toFixed(3)} g`;
}

/** Formats a plain number to 3 decimal places without the unit suffix. */
export function formatWeightValue(value: Decimal.Value): string {
  return new Decimal(value).toFixed(3);
}

const currencyFormatter = new Intl.NumberFormat("en-PK", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Formats a monetary amount rounded to 2dp with thousands separators, e.g. "Rs. 420,000". */
export function formatCurrency(value: Decimal.Value): string {
  const decimal = new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  const formatted = currencyFormatter.format(decimal.toNumber());
  return `Rs. ${formatted}`;
}

/** Formats a rate per gram, e.g. "Rs. 40,000/g". */
export function formatRatePerGram(value: Decimal.Value): string {
  return `${formatCurrency(value)}/g`;
}

export function formatDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
