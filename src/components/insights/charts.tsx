"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CategoryIcon } from "@/components/ledger/category-icon";
import { cn } from "@/lib/utils";
import { heatLevel } from "@/modules/analytics/domain/insights";
import { addDays } from "@/shared/kernel/time";

import { ChartCard, DataTable, LegendItem } from "./chart-card";
import { useMoneyFormat } from "./use-money-format";

const axisTick = { fill: "var(--fg-muted)", fontSize: 12 };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const FULL_WEEKDAYS = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
];
const monthLabel = (ym: string) => MONTHS[Number(ym.slice(5, 7)) - 1] ?? "";
const dayLabel = (ymd: string) =>
  new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );

function TooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-body-sm shadow-xl">
      <p className="mb-1 font-semibold">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2 text-fg-muted">
          {r.color && (
            <span className="size-2.5 rounded-[3px]" style={{ background: r.color }} aria-hidden />
          )}
          {r.label}
          <span className="ml-auto pl-3 font-medium text-fg tabular">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

export function IncomeExpenseChart({
  months,
}: {
  months: { month: string; expense: number; income: number }[];
}) {
  const money = useMoneyFormat();
  const data = months.map((m) => ({ ...m, label: monthLabel(m.month) }));

  return (
    <ChartCard
      title="Income vs spending"
      subtitle="Last 12 months"
      legend={
        <>
          <LegendItem color="var(--series-income)" label="Income" />
          <LegendItem color="var(--series-expense)" label="Spending" />
        </>
      }
      chart={
        <div className="h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              barGap={2}
              barCategoryGap="24%"
              margin={{ top: 8, right: 4, bottom: 0, left: 4 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
              <XAxis
                dataKey="label"
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => money.compact(v)}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload }) => {
                  const row = payload[0]?.payload as (typeof data)[number] | undefined;
                  if (!active || !row) return null;
                  return (
                    <TooltipBox
                      title={`${monthLabel(row.month)} ${row.month.slice(0, 4)}`}
                      rows={[
                        {
                          label: "Income",
                          value: money.full(row.income),
                          color: "var(--series-income)",
                        },
                        {
                          label: "Spending",
                          value: money.full(row.expense),
                          color: "var(--series-expense)",
                        },
                        { label: "Net", value: money.full(row.income - row.expense) },
                      ]}
                    />
                  );
                }}
              />
              <Bar
                dataKey="income"
                fill="var(--series-income)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                dataKey="expense"
                fill="var(--series-expense)"
                radius={[4, 4, 0, 0]}
                maxBarSize={18}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <DataTable
          head={["Month", "Income", "Spending", "Net"]}
          rows={months.map((m) => [
            `${monthLabel(m.month)} ${m.month.slice(0, 4)}`,
            money.full(m.income),
            money.full(m.expense),
            money.full(m.income - m.expense),
          ])}
        />
      }
    />
  );
}

type ForecastPoint = { date: string; balance: number; events: { label: string; amount: number }[] };

export function ForecastChart({
  points,
  low,
  avgDailySpend,
}: {
  points: ForecastPoint[];
  low: { date: string; balance: number };
  avgDailySpend: number;
}) {
  const money = useMoneyFormat();
  const short = low.balance < 0;

  return (
    <ChartCard
      title="Cash flow forecast"
      subtitle={`Next 30 days · bills, income and about ${money.full(avgDailySpend)}/day spending`}
      chart={
        <div className="grid gap-3">
          <p className={cn("text-body-sm", short ? "text-expense" : "text-fg-muted")}>
            {short
              ? `Heads up: you could be short ${money.full(-low.balance)} around ${dayLabel(low.date)}.`
              : `Lowest point: ${money.full(low.balance)} on ${dayLabel(low.date)}.`}
          </p>
          <div className="h-56 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="forecast-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={axisTick}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tickFormatter={dayLabel}
                  minTickGap={32}
                />
                <YAxis
                  tick={axisTick}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                  tickFormatter={(v: number) => money.compact(v)}
                />
                <ReferenceLine y={0} stroke="var(--expense)" strokeDasharray="4 4" />
                <Tooltip
                  cursor={{ stroke: "var(--fg-muted)", strokeWidth: 1 }}
                  content={({ active, payload }) => {
                    const p = payload[0]?.payload as ForecastPoint | undefined;
                    if (!active || !p) return null;
                    return (
                      <TooltipBox
                        title={dayLabel(p.date)}
                        rows={[
                          {
                            label: "Projected balance",
                            value: money.full(p.balance),
                            color: "var(--series-1)",
                          },
                          ...p.events.map((e) => ({ label: e.label, value: money.full(e.amount) })),
                        ]}
                      />
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--series-1)"
                  strokeWidth={2}
                  fill="url(#forecast-fill)"
                  activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
      table={
        <DataTable
          head={["Date", "Projected balance", "Scheduled"]}
          rows={points.map((p) => [
            dayLabel(p.date),
            money.full(p.balance),
            p.events.map((e) => `${e.label} ${money.full(e.amount)}`).join(", ") || "—",
          ])}
        />
      }
    />
  );
}

type CategoryRow = {
  categoryId: string | null;
  name: string;
  icon: string;
  color: string;
  total: number;
  share: number;
  delta: number | null;
};

export function CategoryBreakdown({ categories }: { categories: CategoryRow[] }) {
  const money = useMoneyFormat();
  const max = Math.max(1, ...categories.map((c) => c.total));
  const rows = categories.slice(0, 10);

  return (
    <ChartCard
      title="Where it went"
      subtitle={categories.length ? `${categories.length} categories` : "No spending yet"}
      chart={
        rows.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-fg-muted">
            Nothing spent in this period.
          </p>
        ) : (
          <ul className="grid gap-3">
            {rows.map((c) => (
              <li
                key={c.categoryId ?? "none"}
                className="grid gap-1.5"
                title={`${c.name}: ${money.full(c.total)} (${c.share}%)`}
              >
                <div className="flex items-center gap-2 text-body-sm">
                  <CategoryIcon
                    icon={c.icon}
                    color={c.color}
                    size="sm"
                    className="size-7 [&_svg]:size-3.5"
                  />
                  <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                  <span className="text-fg-muted tabular">{c.share}%</span>
                  <span className="shrink-0 text-right font-semibold tabular xs:w-24">
                    {money.full(c.total)}
                  </span>
                </div>
                <div className="ml-9 h-2 rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-series-1"
                    style={{ width: `${Math.max(2, (c.total / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )
      }
      table={
        <DataTable
          head={["Category", "Spent", "Share", "vs prev"]}
          rows={categories.map((c) => [
            c.name,
            money.full(c.total),
            `${c.share}%`,
            c.delta === null ? "new" : `${c.delta > 0 ? "+" : ""}${c.delta}%`,
          ])}
        />
      }
    />
  );
}

export function WeekdayChart({ weekdays }: { weekdays: { weekday: number; expense: number }[] }) {
  const money = useMoneyFormat();
  const data = weekdays.map((w) => ({ ...w, label: WEEKDAYS[w.weekday] ?? "" }));
  const top = [...weekdays].sort((a, b) => b.expense - a.expense)[0];

  return (
    <ChartCard
      title="Spending by weekday"
      subtitle={
        top && top.expense > 0
          ? `You spend the most on ${FULL_WEEKDAYS[top.weekday] ?? ""}`
          : "No spending yet"
      }
      chart={
        <div className="h-48 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="label"
                interval={0}
                tick={axisTick}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tick={axisTick}
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => money.compact(v)}
              />
              <Tooltip
                cursor={{ fill: "var(--surface-2)" }}
                content={({ active, payload }) => {
                  const row = payload[0]?.payload as (typeof data)[number] | undefined;
                  if (!active || !row) return null;
                  return (
                    <TooltipBox
                      title={WEEKDAYS[row.weekday] ?? ""}
                      rows={[
                        {
                          label: "Spent",
                          value: money.full(row.expense),
                          color: "var(--series-1)",
                        },
                      ]}
                    />
                  );
                }}
              />
              <Bar dataKey="expense" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      }
      table={
        <DataTable
          head={["Day", "Spent"]}
          rows={data.map((d) => [d.label, money.full(d.expense)])}
        />
      }
    />
  );
}

export function SpendingCalendar({
  start,
  end,
  daily,
  today,
}: {
  start: string;
  end: string;
  daily: { day: string; expense: number }[];
  today: string;
}) {
  const money = useMoneyFormat();
  const byDay = new Map(daily.map((d) => [d.day, d.expense]));
  const max = Math.max(0, ...daily.map((d) => d.expense));
  const first = new Date(`${start}T00:00:00Z`).getUTCDay();
  const days: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  const noSpend = days.filter((d) => d <= today && !byDay.get(d)).length;
  const levels = [
    "var(--surface-2)",
    "var(--heat-1)",
    "var(--heat-2)",
    "var(--heat-3)",
    "var(--heat-4)",
    "var(--heat-5)",
  ];

  return (
    <ChartCard
      title="Daily spending"
      subtitle={`${noSpend} no-spend ${noSpend === 1 ? "day" : "days"} so far`}
      chart={
        <div className="grid gap-3">
          <div
            className="grid grid-cols-7 gap-1 text-center text-caption text-fg-muted"
            aria-hidden
          >
            {WEEKDAYS.map((w) => (
              <span key={w}>{w.charAt(0)}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: days.length > 62 ? 0 : first }, (_, i) => (
              <span key={`pad-${i}`} aria-hidden />
            ))}
            {days.map((d) => {
              const value = byDay.get(d) ?? 0;
              const future = d > today;
              const label = `${dayLabel(d)}: ${future ? "upcoming" : money.full(value)}`;
              return (
                <span
                  key={d}
                  title={label}
                  aria-label={label}
                  role="img"
                  className={cn(
                    "aspect-square min-h-3 rounded-[4px]",
                    future && "opacity-30",
                    d === today && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
                  )}
                  style={{
                    background: future ? "var(--surface-2)" : levels[heatLevel(value, max)],
                  }}
                />
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-1 text-caption text-fg-muted">
            Less
            {levels.map((c) => (
              <span
                key={c}
                className="size-3 rounded-[3px]"
                style={{ background: c }}
                aria-hidden
              />
            ))}
            More
          </div>
        </div>
      }
      table={
        <DataTable
          head={["Day", "Spent"]}
          rows={days
            .filter((d) => d <= today)
            .map((d) => [dayLabel(d), money.full(byDay.get(d) ?? 0)])}
        />
      }
    />
  );
}
