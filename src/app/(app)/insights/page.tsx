import { Download, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  CategoryBreakdown,
  ForecastChart,
  IncomeExpenseChart,
  SpendingCalendar,
  WeekdayChart,
} from "@/components/insights/charts";
import { OinkTakeCard } from "@/components/assistant/oink-take-card";
import { PageHeader } from "@/components/layout/page-header";
import { Amount } from "@/components/ledger/amount";
import { CategoryIcon } from "@/components/ledger/category-icon";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { insights } from "@/modules/analytics/application/analytics.use-cases";
import {
  INSIGHT_PRESETS,
  type InsightPreset,
  PRESET_LABEL,
} from "@/modules/analytics/domain/insights";
import { requireUser } from "@/modules/identity/presentation/dal";
import { analyticsDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Insights" };

function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null || value === 0) return null;
  const up = value > 0;
  const good = invert ? !up : up;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-caption",
        good ? "text-income" : "text-expense",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? "+" : ""}
      {value}%<span className="sr-only"> vs previous period</span>
    </span>
  );
}

function Kpi({
  label,
  children,
  delta,
}: {
  label: string;
  children: React.ReactNode;
  delta?: React.ReactNode;
}) {
  return (
    <Card className="grid gap-1 p-4 max-xs:p-3">
      <p className="text-caption text-fg-muted">{label}</p>
      <div className="text-h3 tabular md:text-h2">{children}</div>
      {delta}
    </Card>
  );
}

export default async function InsightsPage({ searchParams }: PageProps<"/insights">) {
  const user = await requireUser();
  const params = await searchParams;
  const preset: InsightPreset = INSIGHT_PRESETS.includes(params.p as InsightPreset)
    ? (params.p as InsightPreset)
    : "month";
  const data = await insights(analyticsDeps(), user.id, preset);
  const { kpis: k, range } = data;
  const budgets = data.budgets.filter((b) => b.categoryId);

  return (
    <>
      <PageHeader
        title="Insights"
        description="Where your money goes."
        actions={
          <>
            <Button asChild variant="ghost" size="sm">
              <Link href="/insights/recap">
                <Sparkles aria-hidden />
                Monthly recap
              </Link>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/export/transactions?from=${range.start}&to=${range.end}`} download>
                <Download aria-hidden />
                Export CSV
              </a>
            </Button>
          </>
        }
      />

      <nav
        aria-label="Period"
        className="mb-6 flex gap-1 overflow-x-auto rounded-md border border-border bg-bg p-1 sm:inline-flex"
      >
        {INSIGHT_PRESETS.map((p) => (
          <Link
            key={p}
            href={p === "month" ? "/insights" : `/insights?p=${p}`}
            aria-current={p === preset ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-sm px-4 text-body-sm font-semibold whitespace-nowrap transition-colors duration-120",
              p === preset ? "bg-surface-2 text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {PRESET_LABEL[p]}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <section
          aria-label="Summary"
          className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:col-span-12 xl:grid-cols-6"
        >
          <Kpi label="Spent" delta={<Delta value={k.deltas.spent} invert />}>
            <Amount value={k.spent} />
          </Kpi>
          <Kpi label="Earned" delta={<Delta value={k.deltas.earned} />}>
            <Amount value={k.earned} kind="income" />
          </Kpi>
          <Kpi label="Net">
            <Amount value={k.net} sign className={k.net < 0 ? "text-expense" : "text-income"} />
          </Kpi>
          <Kpi label="Savings rate">{k.savingsRate === null ? "—" : `${k.savingsRate}%`}</Kpi>
          <Kpi label="Avg per day">
            <Amount value={k.avgPerDay} />
          </Kpi>
          <Kpi label={range.elapsedDays < range.totalDays ? "Projected spend" : "Total spend"}>
            <Amount value={k.forecast} />
          </Kpi>
        </section>

        {data.preset === "month" && <OinkTakeCard userId={user.id} pigName={user.pigName} />}

        <div className="lg:col-span-7">
          <CategoryBreakdown categories={data.categories} />
        </div>
        <div className="lg:col-span-5">
          <SpendingCalendar
            start={range.start}
            end={range.end}
            daily={data.daily}
            today={data.today}
          />
        </div>

        <div className="lg:col-span-12">
          <IncomeExpenseChart months={data.months} />
        </div>

        <div className="lg:col-span-7">
          <ForecastChart
            points={data.forecast.points}
            low={data.forecast.low}
            avgDailySpend={data.forecast.avgDailySpend}
          />
        </div>
        <div className="lg:col-span-5">
          <WeekdayChart weekdays={data.weekdays} />
        </div>

        {budgets.length > 0 && (
          <Card className="lg:col-span-6">
            <CardHeader>
              <CardTitle>Budget vs actual</CardTitle>
              <Link
                href="/plan"
                className="text-body-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
              >
                Manage
              </Link>
            </CardHeader>
            <ul className="grid gap-3">
              {budgets.map((b) => (
                <li key={b.id} className="grid gap-1.5">
                  <div className="flex items-center gap-2 text-body-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                    <span className="text-fg-muted tabular">
                      {formatPeso(b.spent)} / {formatPeso(b.limit)}
                    </span>
                    <span
                      className={cn(
                        "w-12 text-right font-semibold tabular",
                        b.status === "over" && "text-expense",
                      )}
                    >
                      {Math.round(b.pct)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={b.pct}
                    status={b.status}
                    label={`${b.name}: ${Math.round(b.pct)}% used`}
                  />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className={cn(budgets.length ? "lg:col-span-6" : "lg:col-span-7")}>
          <CardHeader>
            <CardTitle>Biggest expenses</CardTitle>
          </CardHeader>
          {data.biggest.length === 0 ? (
            <p className="text-body-sm text-fg-muted">Nothing spent in this period.</p>
          ) : (
            <ol className="grid gap-2.5">
              {data.biggest.map((b) => (
                <li key={b.id} className="flex items-center gap-3">
                  <CategoryIcon icon={b.icon} color={b.color} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {b.note ? b.note : (b.categoryName ?? "Expense")}
                    </span>
                    <span className="text-caption font-normal text-fg-muted">{b.categoryName}</span>
                  </span>
                  <Amount value={b.amount} className="font-semibold" />
                </li>
              ))}
            </ol>
          )}
          {data.tags.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-caption text-fg-muted">Top tags</p>
              <ul className="flex flex-wrap gap-2">
                {data.tags.map((t) => (
                  <li key={t.tag}>
                    <Link
                      href={`/activity?q=%23${encodeURIComponent(t.tag)}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-body-sm hover:border-fg-muted"
                    >
                      #{t.tag}
                      <span className="text-fg-muted tabular">
                        {formatPeso(t.total, { compact: true })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
