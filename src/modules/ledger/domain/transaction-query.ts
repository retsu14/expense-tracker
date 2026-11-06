import {
  addDays,
  addMonths,
  startOfMonth,
  toYmd,
  type Ymd,
  zonedStart,
} from "@/shared/kernel/time";

import type { TransactionKind } from "./transaction";

export const PERIODS = [
  "all",
  "today",
  "7d",
  "30d",
  "month",
  "last-month",
  "year",
  "custom",
] as const;
export type Period = (typeof PERIODS)[number];

export const PERIOD_LABEL: Record<Period, string> = {
  all: "All time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  "last-month": "Last month",
  year: "This year",
  custom: "Custom",
};

export type TransactionFilter = {
  q: string;
  kind: TransactionKind | null;
  categoryIds: string[];
  accountIds: string[];
  period: Period;
  from: Ymd | null;
  to: Ymd | null;
  min: number | null;
  max: number | null;
};

export type ResolvedFilter = {
  text: string;
  tags: string[];
  kind: TransactionKind | null;
  categoryIds: string[];
  accountIds: string[];
  from: Date | null;
  to: Date | null;
  min: number | null;
  max: number | null;
  exact: number | null;
};

export type Cursor = { occurredAt: Date; id: string };

export const EMPTY_FILTER: TransactionFilter = {
  q: "",
  kind: null,
  categoryIds: [],
  accountIds: [],
  period: "all",
  from: null,
  to: null,
  min: null,
  max: null,
};

export function periodRange(
  period: Period,
  now: Date,
  tz: string,
  custom?: { from: Ymd | null; to: Ymd | null },
): { from: Ymd | null; to: Ymd | null } {
  const today = toYmd(now, tz);
  switch (period) {
    case "all":
      return { from: null, to: null };
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "month":
      return { from: startOfMonth(today), to: addDays(addMonths(today, 1), -1) };
    case "last-month": {
      const start = addMonths(today, -1);
      return { from: start, to: addDays(startOfMonth(today), -1) };
    }
    case "year":
      return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
    case "custom":
      return { from: custom?.from ?? null, to: custom?.to ?? null };
  }
}

const AMOUNT_TOKEN = /^(>=|<=|>|<|=)?₱?(\d+(?:\.\d{1,2})?)$/;

export function parseSearch(q: string) {
  const words: string[] = [];
  const tags: string[] = [];
  let min: number | null = null;
  let max: number | null = null;
  let exact: number | null = null;

  for (const raw of q.trim().split(/\s+/).filter(Boolean).slice(0, 12)) {
    if (raw.startsWith("#") && raw.length > 1) {
      tags.push(raw.slice(1).toLowerCase());
      continue;
    }
    const m = AMOUNT_TOKEN.exec(raw.replace(/,/g, ""));
    if (m?.[2] && (m[1] || /^\d/.test(raw))) {
      const centavos = Math.round(Number(m[2]) * 100);
      const op = m[1] ?? "=";
      if (op === ">") min = centavos + 1;
      else if (op === ">=") min = centavos;
      else if (op === "<") max = centavos - 1;
      else if (op === "<=") max = centavos;
      else exact = centavos;
      continue;
    }
    words.push(raw);
  }

  return { text: words.join(" ").slice(0, 80), tags, min, max, exact };
}

export function resolveFilter(f: TransactionFilter, now: Date, tz: string): ResolvedFilter {
  const search = parseSearch(f.q);
  const range = periodRange(f.period, now, tz, { from: f.from, to: f.to });
  const pick = (a: number | null, b: number | null, fn: (x: number, y: number) => number) =>
    a === null ? b : b === null ? a : fn(a, b);

  return {
    text: search.text,
    tags: search.tags,
    kind: f.kind,
    categoryIds: f.categoryIds,
    accountIds: f.accountIds,
    from: range.from ? zonedStart(range.from, tz) : null,
    to: range.to ? zonedStart(addDays(range.to, 1), tz) : null,
    min: pick(f.min, search.min, Math.max),
    max: pick(f.max, search.max, Math.min),
    exact: search.exact,
  };
}

export function encodeCursor(c: Cursor) {
  const json = JSON.stringify([c.occurredAt.toISOString(), c.id]);
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value) return null;
  try {
    const json = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed) || parsed.length !== 2) return null;
    const [iso, id] = parsed as unknown[];
    if (typeof iso !== "string" || typeof id !== "string") return null;
    const occurredAt = new Date(iso);
    if (Number.isNaN(occurredAt.getTime()) || !/^[0-9a-f-]{36}$/i.test(id)) return null;
    return { occurredAt, id };
  } catch {
    return null;
  }
}

export function isFiltered(f: TransactionFilter) {
  return (
    f.q.trim() !== "" ||
    f.kind !== null ||
    f.categoryIds.length > 0 ||
    f.accountIds.length > 0 ||
    f.period !== "all" ||
    f.min !== null ||
    f.max !== null
  );
}

type Params = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const ids = (v: string | string[] | undefined) =>
  first(v)
    .split(",")
    .filter((x) => UUID.test(x))
    .slice(0, 20);
const pesos = (v: string | string[] | undefined) => {
  const n = Number(first(v));
  return first(v) !== "" && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
const ymd = (v: string | string[] | undefined) => {
  const s = first(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : null;
};

export function parseFilterParams(params: Params): TransactionFilter {
  const kind = first(params.type);
  const period = first(params.period);
  return {
    q: first(params.q).slice(0, 100),
    kind: kind === "expense" || kind === "income" || kind === "transfer" ? kind : null,
    categoryIds: ids(params.cat),
    accountIds: ids(params.acct),
    period: (PERIODS as readonly string[]).includes(period) ? (period as Period) : "all",
    from: ymd(params.from),
    to: ymd(params.to),
    min: pesos(params.min),
    max: pesos(params.max),
  };
}

export function filterToParams(f: TransactionFilter) {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  if (f.kind) p.set("type", f.kind);
  if (f.categoryIds.length) p.set("cat", f.categoryIds.join(","));
  if (f.accountIds.length) p.set("acct", f.accountIds.join(","));
  if (f.period !== "all") p.set("period", f.period);
  if (f.period === "custom" && f.from) p.set("from", f.from);
  if (f.period === "custom" && f.to) p.set("to", f.to);
  if (f.min !== null) p.set("min", String(f.min / 100));
  if (f.max !== null) p.set("max", String(f.max / 100));
  return p;
}
