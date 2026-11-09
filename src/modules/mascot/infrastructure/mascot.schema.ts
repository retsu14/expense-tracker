import { bigint, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "@/modules/identity/infrastructure/identity.schema";

export const pigProgress = pgTable("pig_progress", {
  userId: uuid()
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  bestBalance: bigint({ mode: "number" }).notNull().default(0),
  outfit: text(),
  celebrated: integer().notNull().default(0),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
