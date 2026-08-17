/**
 * Formats/parses the Zarghoon Jewellers branch code. Mirrors
 * src/lib/karigar-code.ts exactly: `Branch.branchCode` (a Postgres
 * autoincrement column) is the single source of truth, and this file only
 * converts it to and from the "ZJB-001" display format — no redundant
 * stored string column, never reused. See BRANCH-ARCHITECTURE.md.
 */

const PREFIX = "ZJB-";
const PAD_LENGTH = 3;

export function formatBranchCode(sequence: number): string {
  return `${PREFIX}${String(sequence).padStart(PAD_LENGTH, "0")}`;
}

/** Parses "ZJB-001" (or a bare "1"/"001") back to its sequence number. Returns null if unparseable. */
export function parseBranchCode(input: string): number | null {
  const trimmed = input.trim().toUpperCase();
  const withoutPrefix = trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length) : trimmed;
  if (!/^\d+$/.test(withoutPrefix)) return null;
  const sequence = Number.parseInt(withoutPrefix, 10);
  if (!Number.isSafeInteger(sequence) || sequence <= 0) return null;
  return sequence;
}
