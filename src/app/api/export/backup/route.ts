import { exportTransactions } from "@/modules/analytics/application/analytics.use-cases";
import { getCurrentUser } from "@/modules/identity/presentation/dal";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { listGoals, listRecurring } from "@/modules/planning/application/planning.use-cases";
import { analyticsDeps, ledgerDeps, planningDeps } from "@/shared/container";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const ledger = ledgerDeps();
  const plan = planningDeps();
  const [settings, accounts, categories, templates, { rows }, budgets, recurring, goals] =
    await Promise.all([
      getSettings(ledger, user.id),
      ledger.ledger.listAccounts(user.id, true),
      ledger.ledger.listCategories(user.id, true),
      ledger.ledger.listTemplates(user.id),
      exportTransactions(analyticsDeps(), user.id, { from: null, to: null }),
      plan.planning.listBudgets(user.id),
      listRecurring(plan, user.id),
      listGoals(plan, user.id),
    ]);

  const strip = <T extends { userId: string }>({ userId: _u, ...rest }: T) => rest;
  const backup = {
    app: "oink",
    version: 1,
    exportedAt: new Date().toISOString(),
    note: "Amounts are in centavos (₱1.00 = 100).",
    profile: {
      username: user.username,
      displayName: user.displayName,
      pigName: user.pigName,
    },
    settings: strip(settings),
    accounts: accounts.map(strip),
    categories: categories.map(strip),
    favorites: templates.map(strip),
    transactions: rows,
    budgets: budgets.map(strip),
    recurring: recurring.map(strip),
    goals: goals.map(strip),
  };

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="oink-backup-${user.username}-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
