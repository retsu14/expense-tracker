import type { Ymd } from "@/shared/kernel/time";

import { daysBetween } from "./period";

export type DebtDirection = "i_owe" | "owed_to_me";

export type Debt = {
  id: string;
  userId: string;
  direction: DebtDirection;
  person: string;
  principal: number;
  dueDate: Ymd | null;
  note: string;
  settledAt: Date | null;
};

export type DebtStatus = "settled" | "overdue" | "due_soon" | "open";

export type DebtWithProgress = Debt & {
  paid: number;
  remaining: number;
  pct: number;
  status: DebtStatus;
  daysUntilDue: number | null;
};

export function debtProgress(debt: Debt, paid: number, today: Ymd): DebtWithProgress {
  const remaining = Math.max(0, debt.principal - paid);
  const daysUntilDue = debt.dueDate ? daysBetween(today, debt.dueDate) : null;
  const status: DebtStatus =
    debt.settledAt || remaining === 0
      ? "settled"
      : daysUntilDue !== null && daysUntilDue < 0
        ? "overdue"
        : daysUntilDue !== null && daysUntilDue <= 7
          ? "due_soon"
          : "open";
  return {
    ...debt,
    paid,
    remaining,
    pct: debt.principal > 0 ? Math.min(100, Math.round((paid / debt.principal) * 1000) / 10) : 0,
    status,
    daysUntilDue,
  };
}

export function debtTotals(debts: DebtWithProgress[]) {
  let owe = 0;
  let owed = 0;
  for (const d of debts) {
    if (d.status === "settled") continue;
    if (d.direction === "i_owe") owe += d.remaining;
    else owed += d.remaining;
  }
  return { owe, owed, net: owed - owe };
}
