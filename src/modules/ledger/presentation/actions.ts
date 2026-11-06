"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";

import {
  completeOnboarding,
  createAccount,
  createCategory,
  createTemplate,
  createTransaction,
  deleteForever,
  deleteTemplate,
  deleteTransactions,
  getTransactionForEdit,
  listTransactions,
  quickAddContext,
  restoreTransactions,
  setAccountArchived,
  setCategoryArchived,
  skipOnboarding,
  suggestCategory,
  updateAccount,
  updateCategory,
  updateTransaction,
} from "@/modules/ledger/application/ledger.use-cases";
import { parseFilterParams } from "@/modules/ledger/domain/transaction-query";
import { requireUser } from "@/modules/identity/presentation/dal";
import { runAction } from "@/shared/action";
import { checkBudgetAlerts } from "@/modules/planning/application/planning.use-cases";
import { ledgerDeps, planningDeps } from "@/shared/container";
import { ok, type Result } from "@/shared/kernel/result";

async function mutate<T>(fn: (userId: string) => Promise<Result<T>>) {
  return runAction(async () => {
    const user = await requireUser();
    const res = await fn(user.id);
    if (res.ok) refresh();
    return res;
  });
}

export async function completeOnboardingAction(input: unknown) {
  const res = await mutate((uid) => completeOnboarding(ledgerDeps(), uid, input));
  if (res.ok) redirect("/");
  return res;
}

export async function skipOnboardingAction() {
  const res = await mutate((uid) => skipOnboarding(ledgerDeps(), uid));
  if (res.ok) redirect("/");
  return res;
}

export async function createTransactionAction(input: unknown) {
  return mutate(async (uid) => {
    const res = await createTransaction(ledgerDeps(), uid, input);
    if (!res.ok || res.value.duplicate) return res.ok ? ok({ ...res.value, alerts: [] }) : res;
    const alerts = await checkBudgetAlerts(planningDeps(), uid).catch(() => []);
    return ok({ ...res.value, alerts });
  });
}

export async function updateTransactionAction(id: string, input: unknown) {
  return mutate(async (uid) => {
    const res = await updateTransaction(ledgerDeps(), uid, id, input);
    if (res.ok) await checkBudgetAlerts(planningDeps(), uid).catch(() => []);
    return res;
  });
}

export async function deleteTransactionsAction(ids: string[]) {
  return mutate((uid) => deleteTransactions(ledgerDeps(), uid, ids));
}

export async function restoreTransactionsAction(ids: string[]) {
  return mutate((uid) => restoreTransactions(ledgerDeps(), uid, ids));
}

export async function deleteForeverAction(ids: string[]) {
  return mutate((uid) => deleteForever(ledgerDeps(), uid, ids));
}

export async function getTransactionAction(id: string) {
  const user = await requireUser();
  return getTransactionForEdit(ledgerDeps(), user.id, id);
}

export async function loadTransactionsAction(
  params: Record<string, string>,
  cursor: string | null,
  limit = 25,
) {
  const user = await requireUser();
  return listTransactions(ledgerDeps(), user.id, parseFilterParams(params), cursor, limit);
}

export async function suggestCategoryAction(kind: "expense" | "income", note: string) {
  const user = await requireUser();
  return suggestCategory(ledgerDeps(), user.id, kind, note);
}

export async function createAccountAction(input: unknown) {
  return mutate((uid) => createAccount(ledgerDeps(), uid, input));
}

export async function updateAccountAction(id: string, input: unknown) {
  return mutate((uid) => updateAccount(ledgerDeps(), uid, id, input));
}

export async function archiveAccountAction(id: string, archived: boolean) {
  return mutate((uid) => setAccountArchived(ledgerDeps(), uid, id, archived));
}

export async function createCategoryAction(input: unknown) {
  return mutate((uid) => createCategory(ledgerDeps(), uid, input));
}

export async function updateCategoryAction(id: string, input: unknown) {
  return mutate((uid) => updateCategory(ledgerDeps(), uid, id, input));
}

export async function archiveCategoryAction(id: string, archived: boolean) {
  return mutate((uid) => setCategoryArchived(ledgerDeps(), uid, id, archived));
}

export async function createTemplateAction(input: unknown) {
  return mutate((uid) => createTemplate(ledgerDeps(), uid, input));
}

export async function deleteTemplateAction(id: string) {
  return mutate(async (uid) => {
    const res = await deleteTemplate(ledgerDeps(), uid, id);
    return res.ok ? ok(undefined) : res;
  });
}

export async function quickAddContextAction(editId: string | null) {
  const user = await requireUser();
  const deps = ledgerDeps();
  const [context, transaction] = await Promise.all([
    quickAddContext(deps, user.id),
    editId ? getTransactionForEdit(deps, user.id, editId) : null,
  ]);
  return { ...context, transaction };
}
