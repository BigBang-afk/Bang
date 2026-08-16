/**
 * Formats/parses the Zarghoon Jewellers invoice number. Mirrors
 * src/lib/barcode-code.ts exactly: `Invoice.sequence` (a Postgres
 * autoincrement column) is the single source of truth, and this file only
 * converts it to and from the "ZJ-INV-000001" display format — no
 * redundant stored string column. See INVOICE-SYSTEM.md.
 */

const PREFIX = "ZJ-INV-";
const PAD_LENGTH = 6;

export function formatInvoiceNumber(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(PAD_LENGTH, "0")}`;
}

/** Parses "ZJ-INV-000001" (or a bare "1"/"000001") back to its sequence number. Returns null if unparseable. */
export function parseInvoiceNumber(input: string): number | null {
  const trimmed = input.trim().toUpperCase();
  const withoutPrefix = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
  if (!/^\d+$/.test(withoutPrefix)) return null;
  const sequence = Number.parseInt(withoutPrefix, 10);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) return null;
  return sequence;
}
