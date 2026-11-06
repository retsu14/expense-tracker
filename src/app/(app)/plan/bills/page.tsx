import type { Metadata } from "next";

import { BillsView } from "@/components/plan/bills-view";
import { requireUser } from "@/modules/identity/presentation/dal";
import { billOccurrences, listRecurring } from "@/modules/planning/application/planning.use-cases";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { ledgerDeps, planningDeps } from "@/shared/container";
import { toYmd } from "@/shared/kernel/time";

export const metadata: Metadata = { title: "Bills" };

export default async function BillsPage() {
  const user = await requireUser();
  const [occurrences, recurring, accounts, categories, settings] = await Promise.all([
    billOccurrences(planningDeps(), user.id),
    listRecurring(planningDeps(), user.id),
    ledgerDeps().ledger.listAccounts(user.id),
    ledgerDeps().ledger.listCategories(user.id),
    getSettings(ledgerDeps(), user.id),
  ]);

  return (
    <BillsView
      today={toYmd(new Date(), settings.timezone)}
      occurrences={occurrences}
      recurring={recurring}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories
        .filter((c) => !c.system)
        .map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
    />
  );
}
