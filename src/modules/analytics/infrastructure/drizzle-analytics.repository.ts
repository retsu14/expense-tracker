import "server-only";

import { and, asc, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { AnalyticsRepository } from "@/modules/analytics/domain/ports";
import { accounts, categories, transactions } from "@/modules/ledger/infrastructure/ledger.schema";
import type { Db } from "@/shared/db/client";

const toAccounts = alias(accounts, "to_accounts");

const sumWhen = (kind: "expense" | "income") =>
  sql<number>`coalesce(sum(case when ${transactions.kind} = ${kind} then ${transactions.amount} end), 0)`.mapWith(
    Number,
  );

export function drizzleAnalyticsRepository(db: Db): AnalyticsRepository {
  const live = (userId: string, from: Date, to: Date) =>
    and(
      eq(transactions.userId, userId),
      isNull(transactions.deletedAt),
      gte(transactions.occurredAt, from),
      lt(transactions.occurredAt, to),
    );

  return {
    async totals(userId, from, to) {
      const [row] = await db
        .select({ expense: sumWhen("expense"), income: sumWhen("income"), count: count() })
        .from(transactions)
        .where(live(userId, from, to));
      return row ?? { expense: 0, income: 0, count: 0 };
    },

    async byCategory(userId, from, to) {
      const rows = await db
        .select({
          categoryId: transactions.categoryId,
          name: categories.name,
          icon: categories.icon,
          color: categories.color,
          total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
          count: count(),
        })
        .from(transactions)
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(and(live(userId, from, to), eq(transactions.kind, "expense")))
        .groupBy(transactions.categoryId, categories.name, categories.icon, categories.color)
        .orderBy(desc(sql`sum(${transactions.amount})`));
      return rows.map((r) => ({
        categoryId: r.categoryId,
        name: r.name ?? "Uncategorized",
        icon: r.icon ?? "circle-dollar-sign",
        color: r.color ?? "#9AA5B1",
        total: r.total,
        count: r.count,
      }));
    },

    async monthly(userId, from, to, tz) {
      const month = sql<string>`to_char(${transactions.occurredAt} at time zone ${tz}, 'YYYY-MM')`;
      return db
        .select({ month, expense: sumWhen("expense"), income: sumWhen("income") })
        .from(transactions)
        .where(live(userId, from, to))
        .groupBy(sql`1`)
        .orderBy(asc(sql`1`));
    },

    async daily(userId, from, to, tz) {
      const day = sql<string>`to_char(${transactions.occurredAt} at time zone ${tz}, 'YYYY-MM-DD')`;
      return db
        .select({ day, expense: sumWhen("expense"), income: sumWhen("income") })
        .from(transactions)
        .where(live(userId, from, to))
        .groupBy(sql`1`)
        .orderBy(asc(sql`1`));
    },

    async weekday(userId, from, to, tz) {
      const wd = sql<number>`extract(dow from ${transactions.occurredAt} at time zone ${tz})::int`;
      return db
        .select({ weekday: wd, expense: sumWhen("expense") })
        .from(transactions)
        .where(live(userId, from, to))
        .groupBy(sql`1`);
    },

    async biggest(userId, from, to, limit) {
      const rows = await db
        .select({
          id: transactions.id,
          note: transactions.note,
          categoryName: categories.name,
          icon: categories.icon,
          color: categories.color,
          amount: transactions.amount,
          occurredAt: transactions.occurredAt,
        })
        .from(transactions)
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(and(live(userId, from, to), eq(transactions.kind, "expense")))
        .orderBy(desc(transactions.amount))
        .limit(limit);
      return rows;
    },

    async topTags(userId, from, to, limit) {
      const tag = sql<string>`unnest(${transactions.tags})`;
      const rows = await db
        .select({
          tag,
          total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
          count: count(),
        })
        .from(transactions)
        .where(and(live(userId, from, to), eq(transactions.kind, "expense")))
        .groupBy(sql`1`)
        .orderBy(desc(sql`2`))
        .limit(limit);
      return rows;
    },

    async exportRows(userId, from, to) {
      return db
        .select({
          occurredAt: transactions.occurredAt,
          kind: transactions.kind,
          amount: transactions.amount,
          account: accounts.name,
          toAccount: toAccounts.name,
          category: categories.name,
          note: transactions.note,
          tags: transactions.tags,
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .leftJoin(toAccounts, eq(toAccounts.id, transactions.toAccountId))
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            from ? gte(transactions.occurredAt, from) : undefined,
            to ? lt(transactions.occurredAt, to) : undefined,
          ),
        )
        .orderBy(desc(transactions.occurredAt));
    },
  };
}
