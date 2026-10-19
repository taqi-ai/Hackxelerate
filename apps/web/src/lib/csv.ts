/** One CSV cell, quoted, and safe to open in Excel or Sheets: text that starts with = + - @ (or a tab / carriage
 *  return) is prefixed with an apostrophe so it is shown as text instead of being run as a formula. Numbers are
 *  left as numbers, so negative values still work. */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}
