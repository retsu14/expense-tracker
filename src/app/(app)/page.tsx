import { CalendarClock, MessageCircleHeart } from "lucide-react";
import Link from "next/link";

import { RecentTransactions } from "@/components/activity/recent-transactions";
import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { Amount } from "@/components/ledger/amount";
import { CategoryIcon } from "@/components/ledger/category-icon";
import { HomePig } from "@/components/pig/home-pig";
import { GoalPig } from "@/components/plan/goal-pig";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatPeso } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/identity/presentation/dal";
import {
  listTransactions,
  transactionSummary,
} from "@/modules/ledger/application/ledger.use-cases";
import { EMPTY_FILTER } from "@/modules/ledger/domain/transaction-query";
import {
  billOccurrences,
  budgetOverview,
  listGoals,
} from "@/modules/planning/application/planning.use-cases";
import { ledgerDeps, planningDeps } from "@/shared/container";
import { addDays } from "@/shared/kernel/time";

function SeeAll({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="rounded-sm text-body-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
    >
      See all
    </Link>
  );
}

const dueText = (status: string, days: number) =>
  status === "overdue" ? "Overdue" : days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`;

export default async function HomePage() {
  const user = await requireUser();
  const deps = ledgerDeps();
  const plan = planningDeps();
  const [month, recent, accounts, overview, goals] = await Promise.all([
    transactionSummary(deps, user.id, { ...EMPTY_FILTER, period: "month" }),
    listTransactions(deps, user.id, EMPTY_FILTER, null, 5),
    deps.ledger.listAccounts(user.id),
    budgetOverview(plan, user.id),
    listGoals(plan, user.id),
  ]);
  const bills = (
    await billOccurrences(plan, user.id, {
      from: addDays(overview.today, -31),
      to: addDays(overview.today, 7),
    })
  ).filter((b) => b.status === "overdue" || b.status === "due_soon" || b.status === "upcoming");
  const balance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const net = month.income - month.expense;
  const topBudgets = overview.items.filter((i) => i.categoryId).slice(0, 3);
  const activeGoals = goals.filter((g) => g.status === "active");
  const safe = overview.safe;

  return (
    <>
      <PageHeader title="Home" description="Your money at a glance." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <Card className="flex flex-col items-center justify-center gap-3 overflow-visible lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
          <HomePig
            name={user.displayName}
            pigName={user.pigName}
            budgetUsedPct={overview.usedPct}
            alertPct={overview.alertPct}
          />
          <Link
            href="/assistant"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-body-sm font-medium transition-colors duration-120 hover:bg-surface-2"
          >
            <MessageCircleHeart className="size-4 text-pig" aria-hidden />
            Ask {user.pigName}
          </Link>
        </Card>

        <Card className="lg:col-span-8 lg:row-start-1">
          {safe ? (
            <>
              <p className="text-body-sm text-fg-muted">Safe to spend today</p>
              <Amount value={safe.perDay} className="mt-1 block text-display-sm md:text-display" />
              <p className="mt-1 text-body-sm text-fg-muted">
                for the next {safe.daysLeft} {safe.daysLeft === 1 ? "day" : "days"}
                {overview.overall &&
                  ` · ${formatPeso(Math.max(0, overview.overall.remaining))} of ${formatPeso(overview.overall.limit)} left`}
              </p>
            </>
          ) : (
            <>
              <p className="text-body-sm text-fg-muted">Total balance</p>
              <Amount value={balance} className="mt-1 block text-display-sm md:text-display" />
              <Link
                href="/plan"
                className="mt-1 inline-block text-body-sm text-fg-muted underline underline-offset-4 hover:text-fg"
              >
                Set a budget to see your daily limit
              </Link>
            </>
          )}
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-caption text-fg-muted">{safe ? "Balance" : "Spent"}</dt>
              <dd className="mt-0.5 font-semibold">
                <Amount value={safe ? balance : month.expense} />
              </dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">{safe ? "Spent" : "Earned"}</dt>
              <dd className="mt-0.5 font-semibold">
                {safe ? (
                  <Amount value={month.expense} />
                ) : (
                  <Amount value={month.income} kind="income" />
                )}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Net this month</dt>
              <dd className={cn("mt-0.5 font-semibold", net < 0 ? "text-expense" : "text-income")}>
                <Amount value={net} sign />
              </dd>
            </div>
          </dl>
        </Card>

        {bills.length > 0 && (
          <Card className="lg:col-span-8">
            <CardHeader>
              <CardTitle>Upcoming bills</CardTitle>
              <SeeAll href="/plan/bills" />
            </CardHeader>
            <ul className="grid gap-2">
              {bills.slice(0, 4).map((b) => (
                <li key={`${b.recurringId}:${b.due}`} className="flex items-center gap-3">
                  <CalendarClock
                    className={cn(
                      "size-5 shrink-0",
                      b.status === "overdue"
                        ? "text-expense"
                        : b.status === "due_soon"
                          ? "text-warning"
                          : "text-fg-muted",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <span
                    className={cn(
                      "text-caption",
                      b.status === "overdue" ? "text-expense" : "text-fg-muted",
                    )}
                  >
                    {dueText(b.status, b.daysUntil)}
                  </span>
                  <Amount value={b.amount} kind={b.kind} sign className="font-semibold" />
                </li>
              ))}
            </ul>
          </Card>
        )}

        {topBudgets.length > 0 && (
          <Card className={cn(bills.length ? "lg:col-span-4" : "lg:col-span-8")}>
            <CardHeader>
              <CardTitle>Budgets</CardTitle>
              <SeeAll href="/plan" />
            </CardHeader>
            <ul className="grid gap-3">
              {topBudgets.map((b) => (
                <li key={b.id} className="grid gap-1.5">
                  <div className="flex items-center gap-2 text-body-sm">
                    <CategoryIcon
                      icon={b.icon}
                      color={b.color}
                      size="sm"
                      className="size-6 [&_svg]:size-3.5"
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{b.name}</span>
                    <span
                      className={cn(
                        "tabular",
                        b.status === "over" ? "text-expense" : "text-fg-muted",
                      )}
                    >
                      {Math.round(b.pct)}%
                    </span>
                  </div>
                  <ProgressBar value={b.pct} status={b.status} label={`${b.name} budget used`} />
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Recent</CardTitle>
            {recent.items.length > 0 && <SeeAll href="/activity" />}
          </CardHeader>
          {recent.items.length > 0 ? (
            <RecentTransactions items={recent.items} timezone={recent.timezone} />
          ) : (
            <EmptyState
              title="No transactions yet"
              description={`Log your first expense and ${user.pigName} will start tracking for you.`}
              action={<AddTransactionButton />}
              className="border-none py-6"
            />
          )}
        </Card>

        {activeGoals.length > 0 && (
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle>Goals</CardTitle>
              <SeeAll href="/plan/goals" />
            </CardHeader>
            <ul className="grid gap-3">
              {activeGoals.slice(0, 3).map((g) => (
                <li key={g.id} className="flex items-center gap-3">
                  <GoalPig pct={g.pct} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{g.name}</span>
                    <span className="text-caption font-normal text-fg-muted">
                      {formatPeso(g.saved)} of {formatPeso(g.target)}
                    </span>
                  </span>
                  <span className="text-body-sm font-semibold tabular">{Math.floor(g.pct)}%</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}
