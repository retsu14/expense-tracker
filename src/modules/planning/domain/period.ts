import type { PaydaySchedule } from "@/modules/ledger/domain/settings";
import { addDays, addMonths, startOfMonth, type Ymd } from "@/shared/kernel/time";

export type BudgetPeriod = "monthly" | "pay_cycle";
export type Range = { start: Ymd; end: Ymd };

const pad = (n: number) => String(n).padStart(2, "0");

export function daysInMonth(ym: string) {
  return new Date(Date.UTC(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)), 0)).getUTCDate();
}

export function dayOfMonth(ym: string, day: number): Ymd {
  return `${ym}-${pad(Math.min(day, daysInMonth(ym)))}`;
}

export function daysBetween(a: Ymd, b: Ymd) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export function weekday(ymd: Ymd) {
  return new Date(`${ymd}T00:00:00Z`).getUTCDay();
}

export function monthRange(today: Ymd): Range {
  return { start: startOfMonth(today), end: addDays(addMonths(today, 1), -1) };
}

function monthlyCandidates(today: Ymd, days: number[]) {
  const months = [-1, 0, 1].map((m) => addMonths(today, m).slice(0, 7));
  return [...new Set(months.flatMap((ym) => days.map((d) => dayOfMonth(ym, d))))].sort();
}

function paydayCandidates(payday: PaydaySchedule, today: Ymd): Ymd[] | null {
  switch (payday.type) {
    case "semi_monthly":
      return monthlyCandidates(today, payday.days);
    case "monthly":
      return monthlyCandidates(today, [payday.day]);
    case "weekly": {
      const diff = (weekday(today) - payday.weekday + 7) % 7;
      const last = addDays(today, -diff);
      return [addDays(last, -7), last, addDays(last, 7)];
    }
    case "none":
      return null;
  }
}

export function payCycleRange(payday: PaydaySchedule, today: Ymd): Range {
  const candidates = paydayCandidates(payday, today);
  if (!candidates) return monthRange(today);
  const start = [...candidates].reverse().find((d) => d <= today);
  const next = candidates.find((d) => d > today);
  if (!start || !next) return monthRange(today);
  return { start, end: addDays(next, -1) };
}

export function periodRange(period: BudgetPeriod, payday: PaydaySchedule, today: Ymd): Range {
  return period === "pay_cycle" ? payCycleRange(payday, today) : monthRange(today);
}

export function previousRange(period: BudgetPeriod, payday: PaydaySchedule, current: Range) {
  return periodRange(period, payday, addDays(current.start, -1));
}

export function nextPayday(payday: PaydaySchedule, today: Ymd): Ymd | null {
  return paydayCandidates(payday, today)?.find((d) => d > today) ?? null;
}
