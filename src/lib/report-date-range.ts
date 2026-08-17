import { resolveBusinessDateInTimezone } from "@/lib/business-date";

/**
 * The canonical date-preset vocabulary shared by every Phase 6 financial
 * report and the Financial Dashboard. Resolution is always server-side and
 * timezone-aware (see ACCOUNTING.md "Business date") — the client only ever
 * sends the preset name (or a custom from/to pair), never a resolved range.
 */
export const REPORT_DATE_PRESETS = [
  "today",
  "yesterday",
  "this_week",
  "last_7_days",
  "this_month",
  "last_month",
  "this_year",
  "custom",
] as const;
export type ReportDatePreset = (typeof REPORT_DATE_PRESETS)[number];

export type ReportDateRange = { from: Date; to: Date; label: string };

/** Parses a page's `searchParams` (preset/from/to strings) into the {preset, custom} pair every report service function takes. */
export function parseReportDateParams(searchParams: Record<string, string | undefined>): {
  preset: ReportDatePreset;
  custom?: { from: Date; to: Date };
} {
  const preset = (REPORT_DATE_PRESETS as readonly string[]).includes(searchParams.preset ?? "")
    ? (searchParams.preset as ReportDatePreset)
    : "this_month";
  const custom = searchParams.from && searchParams.to ? { from: new Date(searchParams.from), to: new Date(searchParams.to) } : undefined;
  return { preset, custom };
}

function endOfDay(date: Date): Date {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Resolves a preset (or explicit custom range) to a concrete [from, to]
 * instant pair, in the given business timezone. `now` is a parameter
 * (defaults to the real current time) purely so this stays a pure,
 * synchronous, easily unit-testable function — callers pass the real clock
 * in production.
 */
export function resolveReportDateRange(
  preset: ReportDatePreset,
  timezone: string,
  custom?: { from: Date; to: Date },
  now: Date = new Date(),
): ReportDateRange {
  const today = resolveBusinessDateInTimezone(now, timezone);

  switch (preset) {
    case "today":
      return { from: today, to: endOfDay(today), label: "Today" };
    case "yesterday": {
      const yesterday = addDays(today, -1);
      return { from: yesterday, to: endOfDay(yesterday), label: "Yesterday" };
    }
    case "this_week": {
      // Monday-start week, in the business timezone.
      const dayOfWeek = today.getUTCDay(); // 0=Sun..6=Sat
      const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = addDays(today, -daysSinceMonday);
      return { from: monday, to: endOfDay(today), label: "This Week" };
    }
    case "last_7_days":
      return { from: addDays(today, -6), to: endOfDay(today), label: "Last 7 Days" };
    case "this_month": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
      return { from: start, to: endOfDay(today), label: "This Month" };
    }
    case "last_month": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0));
      return { from: start, to: endOfDay(end), label: "Last Month" };
    }
    case "this_year": {
      const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      return { from: start, to: endOfDay(today), label: "This Year" };
    }
    case "custom": {
      if (!custom) throw new Error("A custom date range requires both a from and to date.");
      return { from: custom.from, to: endOfDay(custom.to), label: "Custom Range" };
    }
    default: {
      const exhaustive: never = preset;
      throw new Error(`Unknown report date preset: ${String(exhaustive)}`);
    }
  }
}
