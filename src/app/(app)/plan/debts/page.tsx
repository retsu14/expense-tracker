import type { Metadata } from "next";

import { DebtsView } from "@/components/plan/debts-view";
import { requireUser } from "@/modules/identity/presentation/dal";
import { listDebts } from "@/modules/planning/application/debts.use-cases";
import { ledgerDeps, planningDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Debts" };

export default async function DebtsPage() {
  const user = await requireUser();
  const [data, accounts] = await Promise.all([
    listDebts(planningDeps(), user.id),
    ledgerDeps().ledger.listAccounts(user.id),
  ]);
  return (
    <DebtsView
      debts={data.items}
      totals={data.totals}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
    />
  );
}
