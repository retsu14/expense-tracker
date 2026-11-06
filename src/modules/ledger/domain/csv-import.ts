import { isYmd, type Ymd } from "@/shared/kernel/time";

export type DateFormat = "ymd" | "mdy" | "dmy";
export type SignMode = "negative_is_expense" | "all_expense" | "all_income";

export type ImportMapping = {
  date: number;
  amount: number;
  note: number | null;
  category: number | null;
  dateFormat: DateFormat;
  sign: SignMode;
};

export type ParsedRow = {
  line: number;
  date: Ymd;
  kind: "expense" | "income";
  amount: number;
  note: string;
  category: string;
  key: string;
};

export type RowError = { line: number; message: string };

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src.charAt(i);
    if (quoted) {
      if (ch === '"' && src.charAt(i + 1) === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src.charAt(i + 1) === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.trim()));
}

export function parseDate(value: string, format: DateFormat): Ymd | null {
  const m = /^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/.exec(value.trim());
  if (!m?.[1] || !m[2] || !m[3]) return null;
  const [a, b, c] = [m[1], m[2], m[3]];
  let y: string;
  let mo: string;
  let d: string;
  if (a.length === 4) [y, mo, d] = [a, b, c];
  else if (format === "mdy") [mo, d, y] = [a, b, c];
  else [d, mo, y] = [a, b, c];
  if (y.length === 2) y = `20${y}`;
  const ymd = `${y.padStart(4, "0")}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return isYmd(ymd) ? ymd : null;
}

export function parseAmount(value: string): number | null {
  let text = value
    .trim()
    .replace(/[₱$\s]|PHP/gi, "")
    .replace(/,/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith("-")) {
    negative = !negative;
    text = text.slice(1);
  } else if (text.startsWith("+")) text = text.slice(1);
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const centavos = Math.round(Number(text) * 100);
  return negative ? -centavos : centavos;
}

function hash(input: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
}

export function mapRows(rows: string[][], mapping: ImportMapping, hasHeader: boolean) {
  const parsed: ParsedRow[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();

  rows.slice(hasHeader ? 1 : 0).forEach((row, i) => {
    const line = i + (hasHeader ? 2 : 1);
    const date = parseDate(row[mapping.date] ?? "", mapping.dateFormat);
    const raw = parseAmount(row[mapping.amount] ?? "");
    if (!date) {
      errors.push({ line, message: `Can't read the date "${row[mapping.date] ?? ""}".` });
      return;
    }
    if (raw === null || raw === 0) {
      errors.push({ line, message: `Can't read the amount "${row[mapping.amount] ?? ""}".` });
      return;
    }
    const kind =
      mapping.sign === "all_expense"
        ? "expense"
        : mapping.sign === "all_income"
          ? "income"
          : raw < 0
            ? "expense"
            : "income";
    const note = (mapping.note === null ? "" : (row[mapping.note] ?? "")).slice(0, 140);
    const category = mapping.category === null ? "" : (row[mapping.category] ?? "");
    const base = `${date}|${kind}|${Math.abs(raw)}|${note.toLowerCase()}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    parsed.push({
      line,
      date,
      kind,
      amount: Math.abs(raw),
      note,
      category,
      key: `imp:${hash(`${base}|${n}`)}`,
    });
  });

  return { parsed, errors };
}

export function guessMapping(header: string[]): Partial<ImportMapping> {
  const find = (re: RegExp) => {
    const i = header.findIndex((h) => re.test(h.toLowerCase()));
    return i >= 0 ? i : null;
  };
  return {
    date: find(/date|posted|time/) ?? 0,
    amount: find(/amount|amt|value|debit|php/) ?? 1,
    note: find(/desc|note|memo|details|particular|remarks|name/),
    category: find(/categ|type of|tag/),
  };
}
