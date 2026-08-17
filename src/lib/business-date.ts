/**
 * Normalizes any Date to a UTC midnight timestamp representing a calendar
 * day, matching how Postgres stores the `@db.Date` column. Business date is
 * always derived server-side — never trust a client-supplied date for
 * "today's" rate entry.
 *
 * This uses the SERVER's local calendar day — a known, documented Phase 1
 * limitation (see README.md "Known limitations"). It is the source of truth
 * for the daily gold rate ("today's rate") and is left unchanged here so
 * Phase 1-5 behavior is not disturbed. Phase 6 code that needs a
 * *configurable-timezone* business date (daily closing, report date
 * presets) uses `resolveBusinessDateInTimezone`/`getCurrentBusinessDate`
 * below instead — see ACCOUNTING.md "Business date".
 */
export function toBusinessDate(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function getTodayBusinessDate(): Date {
  return toBusinessDate(new Date());
}

export const DEFAULT_BUSINESS_TIMEZONE = "Asia/Karachi";

/**
 * Resolves the calendar day `instant` falls on when observed in `timeZone`
 * (an IANA name, e.g. "Asia/Karachi"), returned as a UTC-midnight Date for
 * that day — the same representation `toBusinessDate` uses, so the two are
 * interchangeable wherever a `@db.Date` value is expected. Pure and
 * synchronous: the timezone is a parameter, not read from settings here —
 * see `getCurrentBusinessDate` in `financial-settings.service.ts` for the
 * settings-backed convenience wrapper used by Phase 6 daily closing and
 * reports.
 */
export function resolveBusinessDateInTimezone(instant: Date, timeZone: string): Date {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [{ value: year }, , { value: month }, , { value: day }] = formatter.formatToParts(instant);
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
