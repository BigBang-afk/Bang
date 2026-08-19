export function formatPkr(value: number, precision = 2): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

export function formatWeight(value: number | string | { toString(): string }, unit = "g"): string {
  return `${Number(value).toFixed(3)} ${unit}`;
}

export function formatDate(value: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", opts ?? { day: "2-digit", month: "short", year: "numeric" }).format(date);
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

export function purityLabel(purity: "K24" | "K21" | "K18"): string {
  return { K24: "24K", K21: "21K", K18: "18K" }[purity];
}
