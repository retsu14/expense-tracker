import "server-only";

import { type AnalyticsDeps, insights } from "@/modules/analytics/application/analytics.use-cases";
import { getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { listDebts } from "@/modules/planning/application/debts.use-cases";
import { billOccurrences, listGoals } from "@/modules/planning/application/planning.use-cases";
import { addDays, toYmd } from "@/shared/kernel/time";

import type { AssistantSnapshot } from "../domain/snapshot";

export async function assistantSnapshot(
  deps: AnalyticsDeps,
  user: { id: string; displayName: string; pigName: string },
): Promise<AssistantSnapshot> {
  const plan = deps.planning;
  const [data, goals, debts, accounts, settings] = await Promise.all([
    insights(deps, user.id, "month"),
    listGoals(plan, user.id),
    listDebts(plan, user.id),
    plan.ledger.ledger.listAccounts(user.id),
    getSettings(plan.ledger, user.id),
  ]);
  const today = data.today;
  const bills = await billOccurrences(plan, user.id, {
    from: addDays(today, -31),
    to: addDays(today, 14),
  });
  const k = data.kpis;
  const prevSpent = data.months.at(-2)?.expense ?? 0;

  return {
    today,
    name: user.displayName.split(" ")[0] ?? user.displayName,
    pigName: user.pigName,
    month: {
      label: new Intl.DateTimeFormat("en-PH", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${data.range.start}T12:00:00Z`)),
      spent: k.spent,
      earned: k.earned,
      net: k.net,
      savingsRate: k.savingsRate,
      avgPerDay: k.avgPerDay,
      projected: k.forecast,
      daysLeft: Math.max(0, data.range.totalDays - data.range.elapsedDays),
      prevSpent,
    },
    categories: data.categories.slice(0, 6).map((c) => ({
      name: c.name,
      total: c.total,
      share: c.share,
      delta: c.delta,
    })),
    budgets: data.budgets.map((b) => ({
      name: b.name,
      amount: b.amount + b.carry,
      spent: b.spent,
      remaining: b.remaining,
      pct: b.pct,
      status: b.status,
    })),
    safePerDay: data.safe?.perDay ?? null,
    nextPayday: data.nextPayday,
    bills: bills
      .filter((b) => b.kind === "expense" && b.status !== "paid" && b.status !== "skipped")
      .filter((b) => b.status === "overdue" || b.status === "due_soon" || b.status === "upcoming")
      .slice(0, 6)
      .map((b) => ({ name: b.name, amount: b.amount, due: b.due, status: b.status })),
    forecast: {
      lowDate: data.forecast.low.date,
      lowBalance: data.forecast.low.balance,
      endBalance: data.forecast.end,
      until: data.forecast.until,
    },
    balance: accounts.reduce((s, a) => s + a.balance, 0),
    accounts: accounts
      .filter((a) => !a.archived)
      .map((a) => ({ name: a.name, balance: a.balance })),
    goals: goals
      .filter((g) => g.status === "active")
      .slice(0, 5)
      .map((g) => ({
        name: g.name,
        target: g.target,
        saved: g.saved,
        pct: g.pct,
        deadline: g.deadline,
        monthlyNeeded: g.monthlyNeeded,
      })),
    debts: {
      iOwe: debts.totals.owe,
      owedToMe: debts.totals.owed,
      overdue: debts.items.filter((d) => d.status === "overdue").length,
    },
    biggest: data.biggest.slice(0, 3).map((b) => ({
      label: (b.note.trim() ? b.note : null) ?? b.categoryName ?? "Expense",
      amount: b.amount,
      day: toYmd(b.occurredAt, settings.timezone),
    })),
    tags: data.tags.map((t) => t.tag),
  };
}
