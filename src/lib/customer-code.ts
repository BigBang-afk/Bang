/**
 * Formats/parses the Zarghoon Jewellers customer code. Mirrors
 * src/lib/barcode-code.ts and invoice-number.ts exactly: `Customer.customerCode`
 * (a Postgres autoincrement column) is the single source of truth, and this
 * file only converts it to and from the "ZJC-000001" display format — no
 * redundant stored string column, never reused. See CUSTOMER-CRM.md.
 */

const PREFIX = "ZJC-";
const PAD_LENGTH = 6;

export function formatCustomerCode(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(PAD_LENGTH, "0")}`;
}

/** Parses "ZJC-000001" (or a bare "1"/"000001") back to its sequence number. Returns null if unparseable. */
export function parseCustomerCode(input: string): number | null {
  const trimmed = input.trim().toUpperCase();
  const withoutPrefix = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
  if (!/^\d+$/.test(withoutPrefix)) return null;
  const sequence = Number.parseInt(withoutPrefix, 10);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) return null;
  return sequence;
}
