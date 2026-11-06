const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function csvRow(cells: (string | number | null | undefined)[]) {
  return cells.map(csvCell).join(",");
}
