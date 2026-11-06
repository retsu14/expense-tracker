import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { id, timestamps } from "@/shared/db/columns";

export const users = pgTable(
  "users",
  {
    id: id(),
    username: text().notNull(),
    passwordHash: text().notNull(),
    displayName: text().notNull(),
    avatarKey: text(),
    pigName: text().notNull().default("Oink"),
    currency: text().$type<"PHP">().notNull().default("PHP"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_username_key").on(sql`lower(${t.username})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    userAgent: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const recoveryCodes = pgTable(
  "recovery_codes",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text().notNull(),
    used: boolean().notNull().default(false),
    usedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("recovery_codes_user_hash_key").on(t.userId, t.codeHash)],
);

export const authAttempts = pgTable("auth_attempts", {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  windowStart: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
