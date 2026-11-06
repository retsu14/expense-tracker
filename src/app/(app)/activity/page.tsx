import { Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ActivityList } from "@/components/activity/activity-list";
import { ActivityToolbar } from "@/components/activity/activity-toolbar";
import { Amount } from "@/components/ledger/amount";
import { AddTransactionButton } from "@/components/layout/add-transaction-button";
import { PageHeader } from "@/components/layout/page-header";
import { PendingEntries } from "@/components/pwa/pending-entries";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/modules/identity/presentation/dal";
import {
  listTransactions,
  transactionSummary,
} from "@/modules/ledger/application/ledger.use-cases";
import {
  filterToParams,
  isFiltered,
  parseFilterParams,
} from "@/modules/ledger/domain/transaction-query";
import { ledgerDeps } from "@/shared/container";
import { toYmd } from "@/shared/kernel/time";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({ searchParams }: PageProps<"/activity">) {
  const user = await requireUser();
  const filter = parseFilterParams(await searchParams);
  const deps = ledgerDeps();

  const [page, summary, accounts, categories] = await Promise.all([
    listTransactions(deps, user.id, filter, null, 30),
    transactionSummary(deps, user.id, filter),
    deps.ledger.listAccounts(user.id, true),
    deps.ledger.listCategories(user.id, true),
  ]);
  const params = Object.fromEntries(filterToParams(filter));
  const filtered = isFiltered(filter);

  return (
    <>
      <PageHeader
        title="Activity"
        description="Every peso in and out."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/trash">
              <Trash2 aria-hidden />
              Trash
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4">
        <ActivityToolbar
          filter={filter}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name, color: a.color }))}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind,
            icon: c.icon,
            color: c.color,
          }))}
        />
        <PendingEntries />
        <p className="text-body-sm text-fg-muted" aria-live="polite">
          {summary.count} {summary.count === 1 ? "transaction" : "transactions"}
          {summary.expense > 0 && (
            <>
              {" · "}Spent <Amount value={summary.expense} className="font-semibold text-fg" />
            </>
          )}
          {summary.income > 0 && (
            <>
              {" · "}Earned{" "}
              <Amount value={summary.income} kind="income" className="font-semibold" />
            </>
          )}
        </p>
        <ActivityList
          key={JSON.stringify(params)}
          initial={page}
          params={params}
          today={toYmd(new Date(), page.timezone)}
          empty={
            filtered
              ? { title: "No matches", description: "Try a different search or clear the filters." }
              : {
                  title: "No transactions yet",
                  description: "Log your first expense and it will show up here.",
                  action: <AddTransactionButton />,
                }
          }
        />
      </div>
    </>
  );
}
