/**
 * Normalizes any Date to a UTC midnight timestamp representing a calendar
 * day, matching how Postgres stores the `@db.Date` column. Business date is
 * always derived server-side — never trust a client-supplied date for
 * "today's" rate entry.
 */
export function toBusinessDate(date: Date = new Date()): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function getTodayBusinessDate(): Date {
  return toBusinessDate(new Date());
}
