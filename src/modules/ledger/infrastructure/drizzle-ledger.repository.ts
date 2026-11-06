import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { Account } from "@/modules/ledger/domain/account";
import type { Category } from "@/modules/ledger/domain/category";
import type { LedgerRepository, NewTransaction } from "@/modules/ledger/domain/ports";
import type { Transaction, TransactionView } from "@/modules/ledger/domain/transaction";
import type { ResolvedFilter } from "@/modules/ledger/domain/transaction-query";
import type { Db } from "@/shared/db/client";

import {
  accounts,
  categories,
  savedFilters,
  templates,
  transactions,
  userSettings,
} from "./ledger.schema";

const toAccounts = alias(accounts, "to_accounts");

type TxRow = typeof transactions.$inferSelect;
type AccountRow = typeof accounts.$inferSelect;
type CategoryRow = typeof categories.$inferSelect;

const toTx = (r: TxRow): Transaction => ({
  id: r.id,
  userId: r.userId,
  kind: r.kind,
  amount: r.amount,
  accountId: r.accountId,
  toAccountId: r.toAccountId,
  categoryId: r.categoryId,
  linkedId: r.linkedId,
  splitGroup: r.splitGroup,
  occurredAt: r.occurredAt,
  note: r.note,
  tags: r.tags,
  createdAt: r.createdAt,
  deletedAt: r.deletedAt,
});

const toAccount = (r: AccountRow): Account => ({
  id: r.id,
  userId: r.userId,
  name: r.name,
  type: r.type,
  openingBalance: r.openingBalance,
  color: r.color,
  archived: r.archived,
  sort: r.sort,
  createdAt: r.createdAt,
});

const toCategory = (r: CategoryRow): Category => ({
  id: r.id,
  userId: r.userId,
  name: r.name,
  kind: r.kind,
  icon: r.icon,
  color: r.color,
  archived: r.archived,
  sort: r.sort,
  system: r.system,
});

const viewColumns = {
  tx: transactions,
  accountName: accounts.name,
  toAccountName: toAccounts.name,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categoryColor: categories.color,
};

type ViewRow = {
  tx: TxRow;
  accountName: string;
  toAccountName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
};

const toView = (r: ViewRow): TransactionView => ({
  ...toTx(r.tx),
  accountName: r.accountName,
  toAccountName: r.toAccountName,
  categoryName: r.categoryName,
  categoryIcon: r.categoryIcon,
  categoryColor: r.categoryColor,
});

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

function filterConditions(userId: string, f: ResolvedFilter): SQL[] {
  const where: SQL[] = [eq(transactions.userId, userId), isNull(transactions.deletedAt)];

  if (f.kind) where.push(eq(transactions.kind, f.kind));
  if (f.categoryIds.length) where.push(inArray(transactions.categoryId, f.categoryIds));
  if (f.accountIds.length) {
    const byAccount = or(
      inArray(transactions.accountId, f.accountIds),
      inArray(transactions.toAccountId, f.accountIds),
    );
    if (byAccount) where.push(byAccount);
  }
  if (f.from) where.push(gte(transactions.occurredAt, f.from));
  if (f.to) where.push(lt(transactions.occurredAt, f.to));
  if (f.min !== null) where.push(gte(transactions.amount, f.min));
  if (f.max !== null) where.push(lte(transactions.amount, f.max));
  if (f.exact !== null) where.push(eq(transactions.amount, f.exact));
  if (f.tags.length) {
    const tags = sql.join(
      f.tags.map((t) => sql`${t}`),
      sql`, `,
    );
    where.push(sql`${transactions.tags} @> ARRAY[${tags}]::text[]`);
  }

  if (f.text) {
    const like = `%${escapeLike(f.text)}%`;
    const text = or(
      ilike(transactions.note, like),
      sql`word_similarity(${f.text}, ${transactions.note}) > 0.5`,
      ilike(categories.name, like),
      ilike(accounts.name, like),
      ilike(toAccounts.name, like),
    );
    if (text) where.push(text);
  }
  return where;
}

export function drizzleLedgerRepository(db: Db): LedgerRepository {
  const baseView = () =>
    db
      .select(viewColumns)
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .leftJoin(toAccounts, eq(toAccounts.id, transactions.toAccountId))
      .leftJoin(categories, eq(categories.id, transactions.categoryId));

  const where = filterConditions;

  return {
    async getSettings(userId) {
      const [row] = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
      return row
        ? {
            userId: row.userId,
            timezone: row.timezone,
            payday: row.payday,
            monthlyIncome: row.monthlyIncome,
            onboardedAt: row.onboardedAt,
          }
        : null;
    },

    async saveSettings(s) {
      await db
        .insert(userSettings)
        .values(s)
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: {
            timezone: s.timezone,
            payday: s.payday,
            monthlyIncome: s.monthlyIncome,
            onboardedAt: s.onboardedAt,
          },
        });
    },

    async listAccounts(userId, includeArchived = false) {
      const acct = sql.raw('"accounts"."id"');
      const flow = sql<number>`coalesce((
        select sum(case
          when t.kind = 'income' and t.account_id = ${acct} then t.amount
          when t.kind = 'expense' and t.account_id = ${acct} then -t.amount
          when t.kind = 'transfer' and t.account_id = ${acct} then -t.amount
          when t.kind = 'transfer' and t.to_account_id = ${acct} then t.amount
          else 0 end)
        from transactions t
        where t.user_id = ${userId} and t.deleted_at is null
          and (t.account_id = ${acct} or t.to_account_id = ${acct})
      ), 0)`.mapWith(Number);

      const rows = await db
        .select({ account: accounts, flow })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, userId),
            includeArchived ? undefined : eq(accounts.archived, false),
          ),
        )
        .orderBy(asc(accounts.archived), asc(accounts.sort), asc(accounts.createdAt));
      return rows.map((r) => ({
        ...toAccount(r.account),
        balance: r.account.openingBalance + r.flow,
      }));
    },

    async getAccount(userId, id) {
      const [row] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
      return row ? toAccount(row) : null;
    },

    async countAccounts(userId) {
      const [row] = await db
        .select({ n: count() })
        .from(accounts)
        .where(eq(accounts.userId, userId));
      return row?.n ?? 0;
    },

    async createAccounts(list) {
      if (list.length) await db.insert(accounts).values(list);
    },

    async updateAccount(userId, id, patch) {
      const rows = await db
        .update(accounts)
        .set(patch)
        .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
        .returning({ id: accounts.id });
      return rows.length > 0;
    },

    async listCategories(userId, includeArchived = false) {
      const rows = await db
        .select()
        .from(categories)
        .where(
          and(
            eq(categories.userId, userId),
            includeArchived ? undefined : eq(categories.archived, false),
          ),
        )
        .orderBy(asc(categories.kind), asc(categories.sort), asc(categories.name));
      return rows.map(toCategory);
    },

    async getCategory(userId, id) {
      const [row] = await db
        .select()
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.id, id)));
      return row ? toCategory(row) : null;
    },

    async countCategories(userId) {
      const [row] = await db
        .select({ n: count() })
        .from(categories)
        .where(eq(categories.userId, userId));
      return row?.n ?? 0;
    },

    async createCategories(list) {
      if (list.length) await db.insert(categories).values(list);
    },

    async updateCategory(userId, id, patch) {
      const rows = await db
        .update(categories)
        .set(patch)
        .where(and(eq(categories.userId, userId), eq(categories.id, id)))
        .returning({ id: categories.id });
      return rows.length > 0;
    },

    async categoryUsage(userId, since) {
      const rows = await db
        .select({ id: transactions.categoryId, n: count() })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            isNotNull(transactions.categoryId),
            gte(transactions.occurredAt, since),
          ),
        )
        .groupBy(transactions.categoryId);
      return new Map(rows.flatMap((r) => (r.id ? [[r.id, r.n] as const] : [])));
    },

    async findByIdempotencyKey(userId, key) {
      const [row] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.idempotencyKey, key)));
      return row ? toTx(row) : null;
    },

    async getTransaction(userId, id, includeDeleted = false) {
      const [row] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.id, id),
            includeDeleted ? undefined : isNull(transactions.deletedAt),
          ),
        );
      return row ? toTx(row) : null;
    },

    async getLinked(userId, id) {
      const [row] = await db
        .select()
        .from(transactions)
        .where(and(eq(transactions.userId, userId), eq(transactions.linkedId, id)));
      return row ? toTx(row) : null;
    },

    async applyChanges(userId, changes) {
      await db.transaction(async (tx) => {
        const inserts: NewTransaction[] = changes.insert ?? [];
        if (inserts.length) await tx.insert(transactions).values(inserts);
        for (const { id, patch } of changes.update ?? []) {
          await tx
            .update(transactions)
            .set(patch)
            .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
        }
        if (changes.hardDelete?.length) {
          await tx
            .delete(transactions)
            .where(
              and(eq(transactions.userId, userId), inArray(transactions.id, changes.hardDelete)),
            );
        }
      });
    },

    async softDelete(userId, ids, at) {
      if (!ids.length) return 0;
      const rows = await db
        .update(transactions)
        .set({ deletedAt: at })
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            or(inArray(transactions.id, ids), inArray(transactions.linkedId, ids)),
          ),
        )
        .returning({ id: transactions.id });
      return rows.length;
    },

    async restore(userId, ids) {
      if (!ids.length) return 0;
      const rows = await db
        .update(transactions)
        .set({ deletedAt: null })
        .where(
          and(
            eq(transactions.userId, userId),
            isNotNull(transactions.deletedAt),
            or(inArray(transactions.id, ids), inArray(transactions.linkedId, ids)),
          ),
        )
        .returning({ id: transactions.id });
      return rows.length;
    },

    async purgeDeleted(userId, before) {
      const rows = await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNotNull(transactions.deletedAt),
            lt(transactions.deletedAt, before),
          ),
        )
        .returning({ id: transactions.id });
      return rows.length;
    },

    async purgeIds(userId, ids) {
      if (!ids.length) return 0;
      const rows = await db
        .delete(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNotNull(transactions.deletedAt),
            or(inArray(transactions.id, ids), inArray(transactions.linkedId, ids)),
          ),
        )
        .returning({ id: transactions.id });
      return rows.length;
    },

    async list(userId, filter, cursor, limit) {
      const conditions = where(userId, filter);
      if (cursor) {
        conditions.push(
          sql`(${transactions.occurredAt}, ${transactions.id}) < (${cursor.occurredAt.toISOString()}::timestamptz, ${cursor.id}::uuid)`,
        );
      }
      const rows = await baseView()
        .where(and(...conditions))
        .orderBy(desc(transactions.occurredAt), desc(transactions.id))
        .limit(limit);
      return rows.map(toView);
    },

    async listDeleted(userId, limit) {
      const rows = await baseView()
        .where(
          and(
            eq(transactions.userId, userId),
            isNotNull(transactions.deletedAt),
            isNull(transactions.linkedId),
          ),
        )
        .orderBy(desc(transactions.deletedAt))
        .limit(limit);
      return rows.map(toView);
    },

    async summary(userId, filter) {
      const [row] = await db
        .select({
          count: count(),
          expense:
            sql<number>`coalesce(sum(case when ${transactions.kind} = 'expense' then ${transactions.amount} end), 0)`.mapWith(
              Number,
            ),
          income:
            sql<number>`coalesce(sum(case when ${transactions.kind} = 'income' then ${transactions.amount} end), 0)`.mapWith(
              Number,
            ),
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .leftJoin(toAccounts, eq(toAccounts.id, transactions.toAccountId))
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(and(...where(userId, filter)));
      return row ?? { count: 0, expense: 0, income: 0 };
    },

    async dayTotals(userId, filter, days, tz) {
      if (!days.length) return [];
      const day = sql<string>`to_char(${transactions.occurredAt} at time zone ${tz}, 'YYYY-MM-DD')`;
      const rows = await db
        .select({
          day,
          expense:
            sql<number>`coalesce(sum(case when ${transactions.kind} = 'expense' then ${transactions.amount} end), 0)`.mapWith(
              Number,
            ),
          income:
            sql<number>`coalesce(sum(case when ${transactions.kind} = 'income' then ${transactions.amount} end), 0)`.mapWith(
              Number,
            ),
        })
        .from(transactions)
        .innerJoin(accounts, eq(accounts.id, transactions.accountId))
        .leftJoin(toAccounts, eq(toAccounts.id, transactions.toAccountId))
        .leftJoin(categories, eq(categories.id, transactions.categoryId))
        .where(and(...where(userId, filter), inArray(day, days)))
        .groupBy(sql`1`);
      return rows;
    },

    async expenseByCategory(userId, from, to) {
      return db
        .select({
          categoryId: transactions.categoryId,
          total: sql<number>`sum(${transactions.amount})`.mapWith(Number),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            eq(transactions.kind, "expense"),
            gte(transactions.occurredAt, from),
            lt(transactions.occurredAt, to),
          ),
        )
        .groupBy(transactions.categoryId);
    },

    async lastUsedAccountId(userId) {
      const [row] = await db
        .select({ id: transactions.accountId })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            isNull(transactions.deletedAt),
            ne(transactions.kind, "transfer"),
          ),
        )
        .orderBy(desc(transactions.createdAt))
        .limit(1);
      return row?.id ?? null;
    },

    async suggestCategoryId(userId, kind, note) {
      const text = note.trim();
      if (text.length < 2) return null;
      const [row] = await db
        .select({ id: transactions.categoryId, n: count() })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.kind, kind),
            isNull(transactions.deletedAt),
            isNotNull(transactions.categoryId),
            sql`similarity(${transactions.note}, ${text}) > 0.3`,
          ),
        )
        .groupBy(transactions.categoryId)
        .orderBy(desc(count()))
        .limit(1);
      return row?.id ?? null;
    },

    async bulkUpdate(userId, ids, patch, kind) {
      if (!ids.length) return 0;
      const rows = await db
        .update(transactions)
        .set(patch)
        .where(
          and(
            eq(transactions.userId, userId),
            inArray(transactions.id, ids),
            isNull(transactions.deletedAt),
            isNull(transactions.linkedId),
            kind ? eq(transactions.kind, kind) : ne(transactions.kind, "transfer"),
          ),
        )
        .returning({ id: transactions.id });
      return rows.length;
    },

    async listSavedFilters(userId) {
      const rows = await db
        .select()
        .from(savedFilters)
        .where(eq(savedFilters.userId, userId))
        .orderBy(asc(savedFilters.createdAt));
      return rows.map((r) => ({ id: r.id, name: r.name, params: r.params }));
    },
    async createSavedFilter(f) {
      await db.insert(savedFilters).values(f);
    },
    async deleteSavedFilter(userId, id) {
      const rows = await db
        .delete(savedFilters)
        .where(and(eq(savedFilters.userId, userId), eq(savedFilters.id, id)))
        .returning({ id: savedFilters.id });
      return rows.length > 0;
    },
    async countSavedFilters(userId) {
      const [row] = await db
        .select({ n: count() })
        .from(savedFilters)
        .where(eq(savedFilters.userId, userId));
      return row?.n ?? 0;
    },

    async listTemplates(userId) {
      const rows = await db
        .select()
        .from(templates)
        .where(eq(templates.userId, userId))
        .orderBy(asc(templates.sort), asc(templates.createdAt));
      return rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        kind: r.kind,
        amount: r.amount,
        categoryId: r.categoryId,
        accountId: r.accountId,
        note: r.note,
        sort: r.sort,
      }));
    },

    async countTemplates(userId) {
      const [row] = await db
        .select({ n: count() })
        .from(templates)
        .where(eq(templates.userId, userId));
      return row?.n ?? 0;
    },

    async createTemplate(t) {
      await db.insert(templates).values(t);
    },

    async deleteTemplate(userId, id) {
      const rows = await db
        .delete(templates)
        .where(and(eq(templates.userId, userId), eq(templates.id, id)))
        .returning({ id: templates.id });
      return rows.length > 0;
    },
  };
}
