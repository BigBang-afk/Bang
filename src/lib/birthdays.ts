/**
 * Pure date-math helpers for birthday detection. Operates on month/day only
 * (year of birth is irrelevant to "is today your birthday"), and correctly
 * wraps around year-end for "upcoming in N days" windows.
 */

export function daysUntilNextBirthday(dob: Date, today: Date = new Date()): number {
  const todayUTC = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  let next = Date.UTC(today.getFullYear(), dob.getMonth(), dob.getDate());
  if (next < todayUTC) {
    next = Date.UTC(today.getFullYear() + 1, dob.getMonth(), dob.getDate());
  }
  return Math.round((next - todayUTC) / (1000 * 60 * 60 * 24));
}

export function isBirthdayToday(dob: Date, today: Date = new Date()): boolean {
  return dob.getMonth() === today.getMonth() && dob.getDate() === today.getDate();
}

export function isBirthdayWithinDays(dob: Date, days: number, today: Date = new Date()): boolean {
  return daysUntilNextBirthday(dob, today) <= days;
}

export function isBirthdayThisMonth(dob: Date, today: Date = new Date()): boolean {
  return dob.getMonth() === today.getMonth();
}

export function age(dob: Date, today: Date = new Date()): number {
  let years = today.getFullYear() - dob.getFullYear();
  const hadBirthday =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hadBirthday) years -= 1;
  return years;
}

export type BirthdayBucket = "today" | "this_week" | "this_month" | "upcoming" | "none";

export function birthdayBucket(dob: Date, today: Date = new Date()): BirthdayBucket {
  const days = daysUntilNextBirthday(dob, today);
  if (days === 0) return "today";
  if (days <= 7) return "this_week";
  if (isBirthdayThisMonth(dob, today) || days <= 31) return "this_month";
  if (days <= 90) return "upcoming";
  return "none";
}
