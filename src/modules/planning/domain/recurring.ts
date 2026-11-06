import { addDays, addMonths, type Ymd } from "@/shared/kernel/time";

import { daysBetween, dayOfMonth, weekday } from "./period";

export type Schedule =
  | { type: "monthly"; day: number }
  | { type: "semi_monthly"; days: [number, number] }
  | { type: "weekly"; weekday: number }
  | { type: "yearly"; month: number; day: number };

export type Recurring = {
  id: string;
  userId: string;
  kind: "expense" | "income";
  name: string;
  amount: number;
  accountId: string;
  categoryId: string;
  schedule: Schedule;
  startDate: Ymd;
  autoPost: boolean;
  remindDays: number;
  active: boolean;
};

export type RecurringPost = {
  recurringId: string;
  dueDate: Ymd;
  status: "paid" | "skipped";
  transactionId: string | null;
};

export type OccurrenceStatus = "paid" | "skipped" | "overdue" | "due_soon" | "upcoming";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0] ?? "th"}`;
};

export function describeSchedule(s: Schedule) {
  switch (s.type) {
    case "monthly":
      return s.day >= 31 ? "Monthly, end of month" : `Monthly on the ${ordinal(s.day)}`;
    case "semi_monthly":
      return `Every ${ordinal(s.days[0])} and ${s.days[1] >= 31 ? "end of month" : ordinal(s.days[1])}`;
    case "weekly":
      return `Weekly on ${WEEKDAYS[s.weekday] ?? "?"}`;
    case "yearly":
      return `Yearly on ${MONTHS[s.month - 1] ?? "?"} ${s.day}`;
  }
}

export function occurrences(s: Schedule, from: Ymd, to: Ymd): Ymd[] {
  if (from > to) return [];
  const out: Ymd[] = [];

  if (s.type === "weekly") {
    let d = addDays(from, (s.weekday - weekday(from) + 7) % 7);
    while (d <= to) {
      out.push(d);
      d = addDays(d, 7);
    }
    return out;
  }

  const months = Math.max(0, Math.round(daysBetween(from, to) / 28)) + 2;
  for (let i = -1; i <= months; i++) {
    const ym = addMonths(from, i).slice(0, 7);
    const days =
      s.type === "monthly"
        ? [dayOfMonth(ym, s.day)]
        : s.type === "semi_monthly"
          ? s.days.map((d) => dayOfMonth(ym, d))
          : Number(ym.slice(5, 7)) === s.month
            ? [dayOfMonth(ym, s.day)]
            : [];
    for (const d of days) if (d >= from && d <= to) out.push(d);
  }
  return [...new Set(out)].sort();
}

export function occurrenceStatus(
  due: Ymd,
  today: Ymd,
  remindDays: number,
  post: RecurringPost | undefined,
): OccurrenceStatus {
  if (post) return post.status;
  if (due < today) return "overdue";
  if (daysBetween(today, due) <= remindDays) return "due_soon";
  return "upcoming";
}

export function postKey(recurringId: string, due: Ymd) {
  return `rec:${recurringId}:${due}`;
}
