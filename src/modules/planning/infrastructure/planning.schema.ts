import {
  bigint,
  boolean,
  date,
  index,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "@/modules/identity/infrastructure/identity.schema";
import { accounts, categories, transactions } from "@/modules/ledger/infrastructure/ledger.schema";
import type { GoalStatus } from "@/modules/planning/domain/goal";
import type { BudgetPeriod } from "@/modules/planning/domain/period";
import type { Notification } from "@/modules/planning/domain/ports";
import type { Schedule } from "@/modules/planning/domain/recurring";
import { id, timestamps } from "@/shared/db/columns";

const userRef = () =>
  uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" });
const money = () => bigint({ mode: "number" });

export const budgets = pgTable(
  "budgets",
  {
    id: id(),
    userId: userRef(),
    categoryId: uuid().references(() => categories.id, { onDelete: "cascade" }),
    period: text().$type<BudgetPeriod>().notNull().default("monthly"),
    amount: money().notNull(),
    rollover: boolean().notNull().default(false),
    alertPct: smallint().notNull().default(80),
    ...timestamps,
  },
  (t) => [unique("budgets_user_category_key").on(t.userId, t.categoryId).nullsNotDistinct()],
);

export const recurring = pgTable(
  "recurring",
  {
    id: id(),
    userId: userRef(),
    kind: text().$type<"expense" | "income">().notNull(),
    name: text().notNull(),
    amount: money().notNull(),
    accountId: uuid()
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid()
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    schedule: jsonb().$type<Schedule>().notNull(),
    startDate: date({ mode: "string" }).notNull(),
    autoPost: boolean().notNull().default(false),
    remindDays: smallint().notNull().default(3),
    active: boolean().notNull().default(true),
    ...timestamps,
  },
  (t) => [index("recurring_user_idx").on(t.userId)],
);

export const recurringPosts = pgTable(
  "recurring_posts",
  {
    recurringId: uuid()
      .notNull()
      .references(() => recurring.id, { onDelete: "cascade" }),
    userId: userRef(),
    dueDate: date({ mode: "string" }).notNull(),
    status: text().$type<"paid" | "skipped">().notNull(),
    transactionId: uuid().references(() => transactions.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.recurringId, t.dueDate] }),
    index("recurring_posts_user_idx").on(t.userId, t.dueDate),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: id(),
    userId: userRef(),
    name: text().notNull(),
    target: money().notNull(),
    deadline: date({ mode: "string" }),
    icon: text().notNull(),
    color: text().notNull(),
    status: text().$type<GoalStatus>().notNull().default("active"),
    completedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: id(),
    goalId: uuid()
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
    userId: userRef(),
    amount: money().notNull(),
    note: text().notNull().default(""),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("goal_contributions_goal_idx").on(t.goalId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: userRef(),
    type: text().$type<Notification["type"]>().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    href: text(),
    dedupeKey: text().notNull(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("notifications_dedupe_key").on(t.userId, t.dedupeKey),
    index("notifications_user_idx").on(t.userId, t.createdAt.desc()),
  ],
);

export const debts = pgTable(
  "debts",
  {
    id: id(),
    userId: userRef(),
    direction: text().$type<"i_owe" | "owed_to_me">().notNull(),
    person: text().notNull(),
    principal: money().notNull(),
    dueDate: date({ mode: "string" }),
    note: text().notNull().default(""),
    settledAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index("debts_user_idx").on(t.userId)],
);

export const debtPayments = pgTable(
  "debt_payments",
  {
    id: id(),
    debtId: uuid()
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    userId: userRef(),
    amount: money().notNull(),
    transactionId: uuid().references(() => transactions.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("debt_payments_debt_idx").on(t.debtId)],
);
