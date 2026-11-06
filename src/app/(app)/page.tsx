import Link from "next/link";

import { RecentTransactions } from "@/components/activity/recent-transactions";
import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { Amount } from "@/components/ledger/amount";
import { PageHeader } from "@/components/layout/page-header";
import { HomePig } from "@/components/pig/home-pig";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { requireUser } from "@/modules/identity/presentation/dal";
import {
  listTransactions,
  transactionSummary,
} from "@/modules/ledger/application/ledger.use-cases";
import { EMPTY_FILTER } from "@/modules/ledger/domain/transaction-query";
import { ledgerDeps } from "@/shared/container";

export default async function HomePage() {
  const user = await requireUser();
  const deps = ledgerDeps();
  const [month, recent, accounts] = await Promise.all([
    transactionSummary(deps, user.id, { ...EMPTY_FILTER, period: "month" }),
    listTransactions(deps, user.id, EMPTY_FILTER, null, 5),
    deps.ledger.listAccounts(user.id),
  ]);
  const balance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const net = month.income - month.expense;

  return (
    <>
      <PageHeader title="Home" description="Your money at a glance." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
        <Card className="flex items-center justify-center overflow-visible lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1">
          <HomePig name={user.displayName} pigName={user.pigName} />
        </Card>

        <Card className="lg:col-span-8 lg:row-start-1">
          <p className="text-body-sm text-fg-muted">Total balance</p>
          <Amount value={balance} className="mt-1 block text-display-sm md:text-display" />
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4">
            <div>
              <dt className="text-caption text-fg-muted">Spent this month</dt>
              <dd className="mt-0.5 font-semibold">
                <Amount value={month.expense} />
              </dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Earned</dt>
              <dd className="mt-0.5 font-semibold">
                <Amount value={month.income} kind="income" />
              </dd>
            </div>
            <div>
              <dt className="text-caption text-fg-muted">Net</dt>
              <dd className={cn("mt-0.5 font-semibold", net < 0 ? "text-expense" : "text-income")}>
                <Amount value={net} sign />
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>Recent</CardTitle>
            {recent.items.length > 0 && (
              <Link
                href="/activity"
                className="rounded-sm text-body-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
              >
                See all
              </Link>
            )}
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
      </div>
    </>
  );
}
