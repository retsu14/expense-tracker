import "server-only";

import { and, asc, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";

import type { Budget } from "@/modules/planning/domain/budget";
import type { Debt } from "@/modules/planning/domain/debt";
import type { Goal } from "@/modules/planning/domain/goal";
import type { PlanningRepository } from "@/modules/planning/domain/ports";
import type { Recurring } from "@/modules/planning/domain/recurring";
import type { Db } from "@/shared/db/client";

import {
  budgets,
  debtPayments,
  debts,
  goalContributions,
  goals,
  notifications,
  recurring,
  recurringPosts,
} from "./planning.schema";

const toBudget = (r: typeof budgets.$inferSelect): Budget => ({
  id: r.id,
  userId: r.userId,
  categoryId: r.categoryId,
  period: r.period,
  amount: r.amount,
  rollover: r.rollover,
  alertPct: r.alertPct,
});

const toRecurring = (r: typeof recurring.$inferSelect): Recurring => ({
  id: r.id,
  userId: r.userId,
  kind: r.kind,
  name: r.name,
  amount: r.amount,
  accountId: r.accountId,
  categoryId: r.categoryId,
  schedule: r.schedule,
  startDate: r.startDate,
  autoPost: r.autoPost,
  remindDays: r.remindDays,
  active: r.active,
});

const toGoal = (r: typeof goals.$inferSelect): Goal => ({
  id: r.id,
  userId: r.userId,
  name: r.name,
  target: r.target,
  deadline: r.deadline,
  icon: r.icon,
  color: r.color,
  status: r.status,
  completedAt: r.completedAt,
});

const toDebt = (r: typeof debts.$inferSelect): Debt => ({
  id: r.id,
  userId: r.userId,
  direction: r.direction,
  person: r.person,
  principal: r.principal,
  dueDate: r.dueDate,
  note: r.note,
  settledAt: r.settledAt,
});

export function drizzlePlanningRepository(db: Db): PlanningRepository {
  const paidSql =
    sql<number>`coalesce((select sum(p.amount) from debt_payments p where p.debt_id = ${sql.raw('"debts"."id"')}), 0)`.mapWith(
      Number,
    );
  const savedSql =
    sql<number>`coalesce((select sum(c.amount) from goal_contributions c where c.goal_id = ${sql.raw('"goals"."id"')}), 0)`.mapWith(
      Number,
    );

  return {
    async listBudgets(userId) {
      const rows = await db
        .select()
        .from(budgets)
        .where(eq(budgets.userId, userId))
        .orderBy(asc(budgets.createdAt));
      return rows.map(toBudget);
    },
    async getBudget(userId, id) {
      const [row] = await db
        .select()
        .from(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.id, id)));
      return row ? toBudget(row) : null;
    },
    async findBudgetForCategory(userId, categoryId) {
      const [row] = await db
        .select()
        .from(budgets)
        .where(
          and(
            eq(budgets.userId, userId),
            categoryId ? eq(budgets.categoryId, categoryId) : isNull(budgets.categoryId),
          ),
        );
      return row ? toBudget(row) : null;
    },
    async createBudgets(list) {
      if (list.length) await db.insert(budgets).values(list).onConflictDoNothing();
    },
    async updateBudget(userId, id, patch) {
      const rows = await db
        .update(budgets)
        .set(patch)
        .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
        .returning({ id: budgets.id });
      return rows.length > 0;
    },
    async deleteBudget(userId, id) {
      const rows = await db
        .delete(budgets)
        .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
        .returning({ id: budgets.id });
      return rows.length > 0;
    },

    async listRecurring(userId) {
      const rows = await db
        .select()
        .from(recurring)
        .where(eq(recurring.userId, userId))
        .orderBy(asc(recurring.name));
      return rows.map(toRecurring);
    },
    async getRecurring(userId, id) {
      const [row] = await db
        .select()
        .from(recurring)
        .where(and(eq(recurring.userId, userId), eq(recurring.id, id)));
      return row ? toRecurring(row) : null;
    },
    async createRecurring(item) {
      await db.insert(recurring).values(item);
    },
    async updateRecurring(userId, id, patch) {
      const rows = await db
        .update(recurring)
        .set(patch)
        .where(and(eq(recurring.userId, userId), eq(recurring.id, id)))
        .returning({ id: recurring.id });
      return rows.length > 0;
    },
    async deleteRecurring(userId, id) {
      const rows = await db
        .delete(recurring)
        .where(and(eq(recurring.userId, userId), eq(recurring.id, id)))
        .returning({ id: recurring.id });
      return rows.length > 0;
    },
    async listPosts(userId, from, to) {
      const rows = await db
        .select()
        .from(recurringPosts)
        .where(
          and(
            eq(recurringPosts.userId, userId),
            gte(recurringPosts.dueDate, from),
            lte(recurringPosts.dueDate, to),
          ),
        );
      return rows.map((r) => ({
        recurringId: r.recurringId,
        dueDate: r.dueDate,
        status: r.status,
        transactionId: r.transactionId,
      }));
    },
    async savePost(userId, post) {
      const rows = await db
        .insert(recurringPosts)
        .values({ ...post, userId })
        .onConflictDoNothing()
        .returning({ id: recurringPosts.recurringId });
      return rows.length > 0;
    },

    async listGoals(userId) {
      const rows = await db
        .select({ goal: goals, saved: savedSql })
        .from(goals)
        .where(eq(goals.userId, userId))
        .orderBy(asc(goals.createdAt));
      return rows.map((r) => ({ ...toGoal(r.goal), saved: r.saved }));
    },
    async getGoal(userId, id) {
      const [row] = await db
        .select({ goal: goals, saved: savedSql })
        .from(goals)
        .where(and(eq(goals.userId, userId), eq(goals.id, id)));
      return row ? { ...toGoal(row.goal), saved: row.saved } : null;
    },
    async createGoal(goal) {
      await db.insert(goals).values(goal);
    },
    async updateGoal(userId, id, patch) {
      const rows = await db
        .update(goals)
        .set(patch)
        .where(and(eq(goals.userId, userId), eq(goals.id, id)))
        .returning({ id: goals.id });
      return rows.length > 0;
    },
    async deleteGoal(userId, id) {
      const rows = await db
        .delete(goals)
        .where(and(eq(goals.userId, userId), eq(goals.id, id)))
        .returning({ id: goals.id });
      return rows.length > 0;
    },
    async addContribution(c) {
      await db.insert(goalContributions).values(c);
    },

    async listDebts(userId) {
      const rows = await db
        .select({ debt: debts, paid: paidSql })
        .from(debts)
        .where(eq(debts.userId, userId))
        .orderBy(asc(debts.createdAt));
      return rows.map((r) => ({ ...toDebt(r.debt), paid: r.paid }));
    },
    async getDebt(userId, id) {
      const [row] = await db
        .select({ debt: debts, paid: paidSql })
        .from(debts)
        .where(and(eq(debts.userId, userId), eq(debts.id, id)));
      return row ? { ...toDebt(row.debt), paid: row.paid } : null;
    },
    async createDebt(debt) {
      await db.insert(debts).values(debt);
    },
    async updateDebt(userId, id, patch) {
      const rows = await db
        .update(debts)
        .set(patch)
        .where(and(eq(debts.userId, userId), eq(debts.id, id)))
        .returning({ id: debts.id });
      return rows.length > 0;
    },
    async deleteDebt(userId, id) {
      const rows = await db
        .delete(debts)
        .where(and(eq(debts.userId, userId), eq(debts.id, id)))
        .returning({ id: debts.id });
      return rows.length > 0;
    },
    async addDebtPayment(p) {
      await db.insert(debtPayments).values(p);
    },

    async listNotifications(userId, limit) {
      const rows = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, userId))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return rows;
    },
    async unreadCount(userId) {
      const [row] = await db
        .select({ n: count() })
        .from(notifications)
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
      return row?.n ?? 0;
    },
    async createNotification(n) {
      const rows = await db
        .insert(notifications)
        .values(n)
        .onConflictDoNothing()
        .returning({ id: notifications.id });
      return rows.length > 0;
    },
    async markAllRead(userId, at) {
      await db
        .update(notifications)
        .set({ readAt: at })
        .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    },
  };
}
