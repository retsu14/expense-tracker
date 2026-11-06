import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { AccountType } from "@/modules/ledger/domain/account";
import type { CategoryIcon, CategoryKind } from "@/modules/ledger/domain/category";
import type { PaydaySchedule } from "@/modules/ledger/domain/settings";
import type { TransactionKind } from "@/modules/ledger/domain/transaction";
import { users } from "@/modules/identity/infrastructure/identity.schema";
import { id, softDelete, timestamps } from "@/shared/db/columns";

const userRef = () =>
  uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });

const money = () => bigint({ mode: "number" });

export const userSettings = pgTable("user_settings", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  timezone: text().notNull().default("Asia/Manila"),
  payday: jsonb().$type<PaydaySchedule>().notNull().default({ type: "none" }),
  monthlyIncome: money(),
  onboardedAt: timestamp({ withTimezone: true }),
  ...timestamps,
});

export const accounts = pgTable(
  "accounts",
  {
    id: id(),
    userId: userRef(),
    name: text().notNull(),
    type: text().$type<AccountType>().notNull(),
    openingBalance: money().notNull().default(0),
    color: text().notNull(),
    archived: boolean().notNull().default(false),
    sort: smallint().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("accounts_user_idx").on(t.userId, t.sort)],
);

export const categories = pgTable(
  "categories",
  {
    id: id(),
    userId: userRef(),
    name: text().notNull(),
    kind: text().$type<CategoryKind>().notNull(),
    icon: text().$type<CategoryIcon>().notNull(),
    color: text().notNull(),
    archived: boolean().notNull().default(false),
    sort: smallint().notNull().default(0),
    system: text().$type<"fees" | "debt_out" | "debt_in">(),
    ...timestamps,
  },
  (t) => [index("categories_user_idx").on(t.userId, t.kind, t.sort)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: id(),
    userId: userRef(),
    kind: text().$type<TransactionKind>().notNull(),
    amount: money().notNull(),
    accountId: uuid()
      .notNull()
      .references(() => accounts.id),
    toAccountId: uuid().references(() => accounts.id),
    categoryId: uuid().references(() => categories.id),
    linkedId: uuid(),
    splitGroup: uuid(),
    occurredAt: timestamp({ withTimezone: true }).notNull(),
    note: text().notNull().default(""),
    tags: text()
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    idempotencyKey: text(),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    index("transactions_user_time_idx").on(t.userId, t.occurredAt.desc(), t.id.desc()),
    index("transactions_user_category_idx").on(t.userId, t.categoryId, t.occurredAt),
    index("transactions_user_account_idx").on(t.userId, t.accountId, t.occurredAt),
    index("transactions_linked_idx").on(t.linkedId),
    index("transactions_split_idx").on(t.splitGroup),
    index("transactions_note_trgm_idx").using("gin", t.note.op("gin_trgm_ops")),
    index("transactions_tags_idx").using("gin", t.tags),
    uniqueIndex("transactions_idempotency_key").on(t.userId, t.idempotencyKey),
  ],
);

export const templates = pgTable(
  "templates",
  {
    id: id(),
    userId: userRef(),
    name: text().notNull(),
    kind: text().$type<"expense" | "income">().notNull(),
    amount: money().notNull(),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    accountId: uuid().references(() => accounts.id, { onDelete: "set null" }),
    note: text().notNull().default(""),
    sort: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [index("templates_user_idx").on(t.userId, t.sort)],
);

export const savedFilters = pgTable(
  "saved_filters",
  {
    id: id(),
    userId: userRef(),
    name: text().notNull(),
    params: jsonb().$type<Record<string, string>>().notNull(),
    ...timestamps,
  },
  (t) => [index("saved_filters_user_idx").on(t.userId)],
);
