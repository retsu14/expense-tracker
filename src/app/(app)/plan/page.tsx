import type { Metadata } from "next";

import { BudgetsView } from "@/components/plan/budgets-view";
import { requireUser } from "@/modules/identity/presentation/dal";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { budgetOverview } from "@/modules/planning/application/planning.use-cases";
import { ledgerDeps, planningDeps } from "@/shared/container";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  const user = await requireUser();
  const [overview, categories, settings] = await Promise.all([
    budgetOverview(planningDeps(), user.id),
    ledgerDeps().ledger.listCategories(user.id),
    getSettings(ledgerDeps(), user.id),
  ]);

  return (
    <BudgetsView
      overview={overview}
      categories={categories
        .filter((c) => c.kind === "expense" && !c.system)
        .map((c) => ({ id: c.id, name: c.name, icon: c.icon, color: c.color }))}
      hasPayday={settings.payday.type !== "none"}
    />
  );
}
