/**
 * Formats/parses the Zarghoon Jewellers income number. Mirrors
 * src/lib/expense-number.ts exactly: `Income.sequence` (a Postgres
 * autoincrement column) is the single source of truth. See
 * EXPENSE-SYSTEM.md.
 */

const PREFIX = "ZJ-INC-";
const PAD_LENGTH = 6;

export function formatIncomeNumber(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(PAD_LENGTH, "0")}`;
}

/** Parses "ZJ-INC-000001" (or a bare "1"/"000001") back to its sequence number. Returns null if unparseable. */
export function parseIncomeNumber(input: string): number | null {
  const trimmed = input.trim().toUpperCase();
  const withoutPrefix = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
  if (!/^\d+$/.test(withoutPrefix)) return null;
  const sequence = Number.parseInt(withoutPrefix, 10);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) return null;
  return sequence;
}
