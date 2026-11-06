import {
  forecastCashflow,
  type InsightPreset,
  insightRange,
  kpis,
  percentChange,
} from "@/modules/analytics/domain/insights";
import type { AnalyticsRepository } from "@/modules/analytics/domain/ports";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import {
  billOccurrences,
  budgetOverview,
  type PlanningDeps,
} from "@/modules/planning/application/planning.use-cases";
import {
  addDays,
  addMonths,
  startOfMonth,
  toYmd,
  type Ymd,
  zonedStart,
} from "@/shared/kernel/time";

export type AnalyticsDeps = {
  analytics: AnalyticsRepository;
  planning: PlanningDeps;
};

const FORECAST_DAYS = 30;

async function context(deps: AnalyticsDeps, userId: string) {
  const settings = await getSettings(deps.planning.ledger, userId);
  const tz = settings.timezone;
  const today = toYmd(deps.planning.ledger.clock.now(), tz);
  const at = (ymd: Ymd) => zonedStart(ymd, tz);
  const after = (ymd: Ymd) => zonedStart(addDays(ymd, 1), tz);
  return { settings, tz, today, at, after };
}

export async function cashflowForecast(deps: AnalyticsDeps, userId: string) {
  const { today, at, after } = await context(deps, userId);
  const until = addDays(today, FORECAST_DAYS);
  const since = addDays(today, -30);

  const [accounts, occurrences, recent, recurring, posts] = await Promise.all([
    deps.planning.ledger.ledger.listAccounts(userId),
    billOccurrences(deps.planning, userId, { from: addDays(today, -31), to: until }),
    deps.analytics.totals(userId, at(since), after(today)),
    deps.planning.planning.listRecurring(userId),
    deps.planning.planning.listPosts(userId, since, until),
  ]);

  const amountOf = new Map(recurring.map((r) => [r.id, r.kind === "expense" ? r.amount : 0]));
  const recurringSpent = posts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + (amountOf.get(p.recurringId) ?? 0), 0);
  const avgDailySpend = Math.max(0, Math.round((recent.expense - recurringSpent) / 30));
  const balance = accounts.reduce((s, a) => s + a.balance, 0);

  const events = occurrences
    .filter((o) => o.status === "overdue" || o.status === "due_soon" || o.status === "upcoming")
    .map((o) => ({
      date: o.due,
      amount: o.kind === "income" ? o.amount : -o.amount,
      label: o.name,
    }));

  const result = forecastCashflow({ balance, today, until, avgDailySpend, events });
  return { ...result, today, until, avgDailySpend, balance };
}

export async function insights(deps: AnalyticsDeps, userId: string, preset: InsightPreset) {
  const { tz, today, at, after } = await context(deps, userId);
  const range = insightRange(preset, today);
  const from = at(range.start);
  const to = after(range.end);
  const prevFrom = at(range.prevStart);
  const prevTo = after(range.prevEnd);
  const trendStart = addMonths(startOfMonth(range.end), -11);

  const [
    current,
    previous,
    categories,
    prevCategories,
    monthly,
    daily,
    weekday,
    biggest,
    tags,
    overview,
    forecast,
  ] = await Promise.all([
    deps.analytics.totals(userId, from, to),
    deps.analytics.totals(userId, prevFrom, prevTo),
    deps.analytics.byCategory(userId, from, to),
    deps.analytics.byCategory(userId, prevFrom, prevTo),
    deps.analytics.monthly(userId, at(trendStart), to, tz),
    deps.analytics.daily(userId, from, to, tz),
    deps.analytics.weekday(userId, from, to, tz),
    deps.analytics.biggest(userId, from, to, 5),
    deps.analytics.topTags(userId, from, to, 6),
    budgetOverview(deps.planning, userId),
    cashflowForecast(deps, userId),
  ]);

  const prevByCategory = new Map(prevCategories.map((c) => [c.categoryId, c.total]));
  const months: { month: string; expense: number; income: number }[] = [];
  const monthMap = new Map(monthly.map((m) => [m.month, m]));
  for (let i = 0; i < 12; i++) {
    const key = addMonths(trendStart, i).slice(0, 7);
    months.push(monthMap.get(key) ?? { month: key, expense: 0, income: 0 });
  }

  const weekdays = Array.from({ length: 7 }, (_, d) => ({
    weekday: d,
    expense: weekday.find((w) => w.weekday === d)?.expense ?? 0,
  }));

  return {
    preset,
    today,
    range,
    kpis: kpis(current, previous, range),
    categories: categories.map((c) => ({
      ...c,
      share: current.expense > 0 ? Math.round((c.total / current.expense) * 1000) / 10 : 0,
      delta: percentChange(c.total, prevByCategory.get(c.categoryId) ?? 0),
    })),
    months,
    daily,
    weekdays,
    biggest,
    tags,
    budgets: overview.items,
    forecast,
  };
}

export async function exportTransactions(
  deps: AnalyticsDeps,
  userId: string,
  range: { from: Ymd | null; to: Ymd | null },
) {
  const { at, after, tz } = await context(deps, userId);
  const rows = await deps.analytics.exportRows(
    userId,
    range.from ? at(range.from) : null,
    range.to ? after(range.to) : null,
  );
  return { rows, tz };
}
