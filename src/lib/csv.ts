/**
 * A small, properly-escaping CSV builder shared by every Phase 6 report
 * export. Values containing a comma, quote, or newline are wrapped in
 * quotes with internal quotes doubled, per RFC 4180 — unlike a plain
 * `.join(",")`, this never produces a broken column when a description or
 * name happens to contain a comma. Architecture is deliberately prepared
 * for future Excel/PDF export (see FINANCIAL-REPORTS.md "Report export")
 * without building either yet — no broken/fake export buttons.
 */
function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(","));
  }
  return lines.join("\r\n");
}
