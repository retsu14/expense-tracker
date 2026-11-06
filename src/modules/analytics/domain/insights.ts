import { addDays, addMonths, startOfMonth, type Ymd } from "@/shared/kernel/time";

export const INSIGHT_PRESETS = ["month", "last-month", "3m", "year"] as const;
export type InsightPreset = (typeof INSIGHT_PRESETS)[number];

export const PRESET_LABEL: Record<InsightPreset, string> = {
  month: "This month",
  "last-month": "Last month",
  "3m": "Last 3 months",
  year: "This year",
};

export type InsightRange = {
  start: Ymd;
  end: Ymd;
  prevStart: Ymd;
  prevEnd: Ymd;
  elapsedDays: number;
  totalDays: number;
};

const dayCount = (a: Ymd, b: Ymd) =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000) + 1;

export function insightRange(preset: InsightPreset, today: Ymd): InsightRange {
  let start: Ymd;
  let end: Ymd;
  let prevStart: Ymd;
  let prevEnd: Ymd;
  switch (preset) {
    case "month":
      start = startOfMonth(today);
      end = addDays(addMonths(today, 1), -1);
      prevStart = addMonths(today, -1);
      prevEnd = addDays(start, -1);
      break;
    case "last-month":
      start = addMonths(today, -1);
      end = addDays(startOfMonth(today), -1);
      prevStart = addMonths(today, -2);
      prevEnd = addDays(start, -1);
      break;
    case "3m":
      start = addMonths(today, -2);
      end = addDays(addMonths(today, 1), -1);
      prevStart = addMonths(today, -5);
      prevEnd = addDays(start, -1);
      break;
    case "year":
      start = `${today.slice(0, 4)}-01-01`;
      end = `${today.slice(0, 4)}-12-31`;
      prevStart = `${Number(today.slice(0, 4)) - 1}-01-01`;
      prevEnd = `${Number(today.slice(0, 4)) - 1}-12-31`;
      break;
  }
  const effectiveEnd = end < today ? end : today;
  return {
    start,
    end,
    prevStart,
    prevEnd,
    elapsedDays: Math.max(1, dayCount(start, effectiveEnd)),
    totalDays: dayCount(start, end),
  };
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

export type Totals = { expense: number; income: number; count: number };

export function kpis(current: Totals, previous: Totals, range: InsightRange) {
  const net = current.income - current.expense;
  const avgPerDay = Math.round(current.expense / range.elapsedDays);
  const forecast =
    range.elapsedDays < range.totalDays
      ? Math.round((current.expense / range.elapsedDays) * range.totalDays)
      : current.expense;
  return {
    spent: current.expense,
    earned: current.income,
    net,
    savingsRate: current.income > 0 ? Math.round((net / current.income) * 1000) / 10 : null,
    avgPerDay,
    forecast,
    count: current.count,
    deltas: {
      spent: percentChange(current.expense, previous.expense),
      earned: percentChange(current.income, previous.income),
      net: percentChange(net, previous.income - previous.expense),
    },
  };
}

export type ForecastEvent = { date: Ymd; amount: number; label: string };
export type ForecastPoint = { date: Ymd; balance: number; events: ForecastEvent[] };

export function forecastCashflow(input: {
  balance: number;
  today: Ymd;
  until: Ymd;
  avgDailySpend: number;
  events: ForecastEvent[];
}) {
  const points: ForecastPoint[] = [];
  let balance = input.balance;
  let low = { date: input.today, balance };
  for (let d = input.today; d <= input.until; d = addDays(d, 1)) {
    const events = input.events.filter((e) => (e.date < input.today ? input.today : e.date) === d);
    if (d !== input.today) balance -= input.avgDailySpend;
    balance += events.reduce((s, e) => s + e.amount, 0);
    points.push({ date: d, balance, events });
    if (balance < low.balance) low = { date: d, balance };
  }
  return { points, low, end: points.at(-1)?.balance ?? input.balance };
}

export function heatLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 | 5 {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio > 0.8) return 5;
  if (ratio > 0.6) return 4;
  if (ratio > 0.4) return 3;
  if (ratio > 0.2) return 2;
  return 1;
}
