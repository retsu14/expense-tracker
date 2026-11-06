import type { Ymd } from "@/shared/kernel/time";

import type { Budget } from "./budget";
import type { Debt } from "./debt";
import type { Goal } from "./goal";
import type { Recurring, RecurringPost } from "./recurring";

export type Notification = {
  id: string;
  userId: string;
  type: "budget" | "bill" | "goal" | "recurring";
  title: string;
  body: string;
  href: string | null;
  dedupeKey: string;
  readAt: Date | null;
  createdAt: Date;
};

export type PlanningRepository = {
  listBudgets(userId: string): Promise<Budget[]>;
  getBudget(userId: string, id: string): Promise<Budget | null>;
  findBudgetForCategory(userId: string, categoryId: string | null): Promise<Budget | null>;
  createBudgets(budgets: Budget[]): Promise<void>;
  updateBudget(
    userId: string,
    id: string,
    patch: Partial<Omit<Budget, "id" | "userId">>,
  ): Promise<boolean>;
  deleteBudget(userId: string, id: string): Promise<boolean>;

  listRecurring(userId: string): Promise<Recurring[]>;
  getRecurring(userId: string, id: string): Promise<Recurring | null>;
  createRecurring(item: Recurring): Promise<void>;
  updateRecurring(
    userId: string,
    id: string,
    patch: Partial<Omit<Recurring, "id" | "userId">>,
  ): Promise<boolean>;
  deleteRecurring(userId: string, id: string): Promise<boolean>;
  listPosts(userId: string, from: Ymd, to: Ymd): Promise<RecurringPost[]>;
  savePost(userId: string, post: RecurringPost): Promise<boolean>;

  listGoals(userId: string): Promise<(Goal & { saved: number })[]>;
  getGoal(userId: string, id: string): Promise<(Goal & { saved: number }) | null>;
  createGoal(goal: Goal): Promise<void>;
  updateGoal(
    userId: string,
    id: string,
    patch: Partial<Omit<Goal, "id" | "userId">>,
  ): Promise<boolean>;
  deleteGoal(userId: string, id: string): Promise<boolean>;
  addContribution(c: {
    id: string;
    goalId: string;
    userId: string;
    amount: number;
    note: string;
  }): Promise<void>;

  listDebts(userId: string): Promise<(Debt & { paid: number })[]>;
  getDebt(userId: string, id: string): Promise<(Debt & { paid: number }) | null>;
  createDebt(debt: Debt): Promise<void>;
  updateDebt(
    userId: string,
    id: string,
    patch: Partial<Omit<Debt, "id" | "userId">>,
  ): Promise<boolean>;
  deleteDebt(userId: string, id: string): Promise<boolean>;
  addDebtPayment(p: {
    id: string;
    debtId: string;
    userId: string;
    amount: number;
    transactionId: string | null;
  }): Promise<void>;

  listNotifications(userId: string, limit: number): Promise<Notification[]>;
  unreadCount(userId: string): Promise<number>;
  createNotification(n: Omit<Notification, "readAt" | "createdAt">): Promise<boolean>;
  markAllRead(userId: string, at: Date): Promise<void>;
};
