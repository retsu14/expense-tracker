"use server";

import { refresh } from "next/cache";

import { requireUser } from "@/modules/identity/presentation/dal";
import type { GoalStatus } from "@/modules/planning/domain/goal";
import {
  budgetSuggestions,
  contributeToGoal,
  createBudget,
  createGoal,
  createRecurring,
  deleteBudget,
  deleteGoal,
  deleteRecurring,
  markNotificationsRead,
  markOccurrence,
  setGoalStatus,
  setRecurringActive,
  updateBudget,
  updateGoal,
  updateRecurring,
} from "@/modules/planning/application/planning.use-cases";
import {
  createDebt,
  deleteDebt,
  recordDebtPayment,
  settleDebt,
  updateDebt,
} from "@/modules/planning/application/debts.use-cases";
import { runAction } from "@/shared/action";
import { planningDeps } from "@/shared/container";
import { ok, type Result } from "@/shared/kernel/result";

async function mutate<T>(fn: (userId: string) => Promise<Result<T>>) {
  return runAction(async () => {
    const user = await requireUser();
    const res = await fn(user.id);
    if (res.ok) refresh();
    return res;
  });
}

export async function createBudgetAction(input: unknown) {
  return mutate((uid) => createBudget(planningDeps(), uid, input));
}

export async function updateBudgetAction(id: string, input: unknown) {
  return mutate((uid) => updateBudget(planningDeps(), uid, id, input));
}

export async function deleteBudgetAction(id: string) {
  return mutate((uid) => deleteBudget(planningDeps(), uid, id));
}

export async function budgetSuggestionsAction() {
  const user = await requireUser();
  return budgetSuggestions(planningDeps(), user.id);
}

export async function applyBudgetSuggestionsAction(
  items: { categoryId: string; amount: string }[],
  period: "monthly" | "pay_cycle",
) {
  return mutate(async (uid) => {
    let created = 0;
    for (const item of items.slice(0, 30)) {
      const res = await createBudget(planningDeps(), uid, {
        categoryId: item.categoryId,
        amount: item.amount,
        period,
        rollover: false,
        alertPct: 80,
      });
      if (res.ok) created++;
    }
    return ok(created);
  });
}

export async function createRecurringAction(input: unknown) {
  return mutate((uid) => createRecurring(planningDeps(), uid, input));
}

export async function updateRecurringAction(id: string, input: unknown) {
  return mutate((uid) => updateRecurring(planningDeps(), uid, id, input));
}

export async function setRecurringActiveAction(id: string, active: boolean) {
  return mutate((uid) => setRecurringActive(planningDeps(), uid, id, active));
}

export async function deleteRecurringAction(id: string) {
  return mutate((uid) => deleteRecurring(planningDeps(), uid, id));
}

export async function markPaidAction(input: unknown) {
  return mutate((uid) => markOccurrence(planningDeps(), uid, input, "paid"));
}

export async function skipOccurrenceAction(input: unknown) {
  return mutate((uid) => markOccurrence(planningDeps(), uid, input, "skipped"));
}

export async function createGoalAction(input: unknown) {
  return mutate((uid) => createGoal(planningDeps(), uid, input));
}

export async function updateGoalAction(id: string, input: unknown) {
  return mutate((uid) => updateGoal(planningDeps(), uid, id, input));
}

export async function setGoalStatusAction(id: string, status: GoalStatus) {
  return mutate((uid) => setGoalStatus(planningDeps(), uid, id, status));
}

export async function deleteGoalAction(id: string) {
  return mutate((uid) => deleteGoal(planningDeps(), uid, id));
}

export async function contributeAction(input: unknown) {
  return mutate((uid) => contributeToGoal(planningDeps(), uid, input));
}

export async function markNotificationsReadAction() {
  return mutate(async (uid) => {
    await markNotificationsRead(planningDeps(), uid);
    return ok(undefined);
  });
}

export async function createDebtAction(input: unknown) {
  return mutate((uid) => createDebt(planningDeps(), uid, input));
}

export async function updateDebtAction(id: string, input: unknown) {
  return mutate((uid) => updateDebt(planningDeps(), uid, id, input));
}

export async function recordDebtPaymentAction(input: unknown) {
  return mutate((uid) => recordDebtPayment(planningDeps(), uid, input));
}

export async function settleDebtAction(id: string) {
  return mutate((uid) => settleDebt(planningDeps(), uid, id));
}

export async function deleteDebtAction(id: string) {
  return mutate((uid) => deleteDebt(planningDeps(), uid, id));
}
