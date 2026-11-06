import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

import type { BudgetPeriod } from "./period";

export type Budget = {
  id: string;
  userId: string;
  categoryId: string | null;
  period: BudgetPeriod;
  amount: number;
  rollover: boolean;
  alertPct: number;
};

export type BudgetStatus = "ok" | "warn" | "over";

export type BudgetProgress = {
  limit: number;
  spent: number;
  remaining: number;
  pct: number;
  status: BudgetStatus;
  carry: number;
};

export function budgetProgress(input: {
  amount: number;
  spent: number;
  carry: number;
  alertPct: number;
}): BudgetProgress {
  const limit = Math.max(0, input.amount + input.carry);
  const pct = limit === 0 ? (input.spent > 0 ? 100 : 0) : (input.spent / limit) * 100;
  const status: BudgetStatus = input.spent > limit ? "over" : pct >= input.alertPct ? "warn" : "ok";
  return {
    limit,
    spent: input.spent,
    remaining: limit - input.spent,
    pct: Math.round(pct * 10) / 10,
    status,
    carry: input.carry,
  };
}

export function rolloverCarry(previous: { amount: number; spent: number } | null) {
  return previous ? previous.amount - previous.spent : 0;
}

export function alertLevel(pct: number, alertPct: number): 0 | 1 | 2 {
  if (pct > 100) return 2;
  if (pct >= alertPct) return 1;
  return 0;
}

export function suggestBudgetAmount(averageCentavos: number) {
  if (averageCentavos <= 0) return 0;
  return Math.ceil(averageCentavos / 10_000) * 10_000;
}

export function safeToSpendPerDay(input: {
  remaining: number;
  reserved: number;
  daysLeft: number;
}) {
  if (input.daysLeft <= 0) return 0;
  return Math.max(0, Math.floor((input.remaining - input.reserved) / input.daysLeft));
}

export function validateAlertPct(value: number): Result<number> {
  if (!Number.isInteger(value) || value < 50 || value > 100) {
    return err(
      new DomainError("invalid_alert", "Alert must be between 50% and 100%.", {
        alertPct: ["Alert must be between 50% and 100%."],
      }),
    );
  }
  return ok(value);
}
