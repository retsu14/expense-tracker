import { z } from "zod";

import { ensureSystemCategory } from "@/modules/ledger/application/ledger-extras.use-cases";
import { createTransaction, getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { evaluateAmount } from "@/modules/ledger/domain/amount-expression";
import { debtProgress, debtTotals } from "@/modules/planning/domain/debt";
import { DomainError, err, ok, type Result } from "@/shared/kernel/result";
import { toYmd } from "@/shared/kernel/time";
import { parse } from "@/shared/validation";

import type { PlanningDeps } from "./planning.use-cases";

const fieldError = (field: string, message: string) =>
  err(new DomainError("validation_failed", message, { [field]: [message] }));
const notFound = () => err(new DomainError("not_found", "Debt not found."));

const debtInput = z.object({
  direction: z.enum(["i_owe", "owed_to_me"]),
  person: z.string().trim().min(1, "Who is it with?").max(40),
  amount: z.string().trim().min(1, "Enter an amount.").max(60),
  dueDate: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .pipe(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .nullable(),
    ),
  note: z.string().trim().max(80).default(""),
});

const paymentInput = z.object({
  debtId: z.uuid(),
  amount: z.string().trim().min(1, "Enter an amount.").max(60),
  accountId: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .pipe(z.uuid().nullable()),
});

async function today(deps: PlanningDeps, userId: string) {
  const { timezone } = await getSettings(deps.ledger, userId);
  return toYmd(deps.ledger.clock.now(), timezone);
}

export async function listDebts(deps: PlanningDeps, userId: string) {
  const [debts, now] = await Promise.all([deps.planning.listDebts(userId), today(deps, userId)]);
  const items = debts.map((d) => debtProgress(d, d.paid, now));
  return { items, totals: debtTotals(items) };
}

export async function createDebt(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const parsed = parse(debtInput, input);
  if (!parsed.ok) return parsed;
  const principal = evaluateAmount(parsed.value.amount);
  if (principal === null) return fieldError("amount", "Enter a valid amount.");
  const id = deps.ledger.newId();
  await deps.planning.createDebt({
    id,
    userId,
    direction: parsed.value.direction,
    person: parsed.value.person,
    principal,
    dueDate: parsed.value.dueDate,
    note: parsed.value.note,
    settledAt: null,
  });
  return ok(id);
}

export async function updateDebt(
  deps: PlanningDeps,
  userId: string,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(debtInput, input);
  if (!parsed.ok) return parsed;
  const principal = evaluateAmount(parsed.value.amount);
  if (principal === null) return fieldError("amount", "Enter a valid amount.");
  const existing = await deps.planning.getDebt(userId, id);
  if (!existing) return notFound();
  await deps.planning.updateDebt(userId, id, {
    direction: parsed.value.direction,
    person: parsed.value.person,
    principal,
    dueDate: parsed.value.dueDate,
    note: parsed.value.note,
    settledAt: existing.paid >= principal ? (existing.settledAt ?? deps.ledger.clock.now()) : null,
  });
  return ok(undefined);
}

export async function recordDebtPayment(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
): Promise<Result<{ remaining: number; settled: boolean }>> {
  const parsed = parse(paymentInput, input);
  if (!parsed.ok) return parsed;
  const debt = await deps.planning.getDebt(userId, parsed.value.debtId);
  if (!debt) return notFound();
  const amount = evaluateAmount(parsed.value.amount);
  if (amount === null) return fieldError("amount", "Enter a valid amount.");
  const remaining = debt.principal - debt.paid;
  if (amount > remaining) {
    return fieldError(
      "amount",
      `Only ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(remaining / 100)} is left.`,
    );
  }

  let transactionId: string | null = null;
  if (parsed.value.accountId) {
    const category = await ensureSystemCategory(
      deps.ledger,
      userId,
      debt.direction === "i_owe" ? "debt_out" : "debt_in",
    );
    const tx = await createTransaction(deps.ledger, userId, {
      kind: debt.direction === "i_owe" ? "expense" : "income",
      amount: (amount / 100).toFixed(2),
      accountId: parsed.value.accountId,
      categoryId: category.id,
      date: await today(deps, userId),
      note: debt.direction === "i_owe" ? `Paid ${debt.person}` : `From ${debt.person}`,
      idempotencyKey: `debt:${deps.ledger.newId()}`,
    });
    if (!tx.ok) return tx;
    transactionId = tx.value.id;
  }

  await deps.planning.addDebtPayment({
    id: deps.ledger.newId(),
    debtId: debt.id,
    userId,
    amount,
    transactionId,
  });

  const left = remaining - amount;
  if (left === 0) {
    await deps.planning.updateDebt(userId, debt.id, { settledAt: deps.ledger.clock.now() });
  }
  return ok({ remaining: left, settled: left === 0 });
}

export async function settleDebt(deps: PlanningDeps, userId: string, id: string) {
  return (await deps.planning.updateDebt(userId, id, { settledAt: deps.ledger.clock.now() }))
    ? ok(undefined)
    : notFound();
}

export async function deleteDebt(deps: PlanningDeps, userId: string, id: string) {
  return (await deps.planning.deleteDebt(userId, id)) ? ok(undefined) : notFound();
}
