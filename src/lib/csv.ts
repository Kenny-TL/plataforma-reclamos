export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  if (typeof value === "string" && /^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function csvDocument(headers: string[], rows: unknown[][]): string {
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\r\n");
}
