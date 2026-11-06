import { timestamp, uuid } from "drizzle-orm/pg-core";

import { newId } from "@/shared/kernel/id";

export const id = () => uuid().primaryKey().$defaultFn(newId);

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const softDelete = {
  deletedAt: timestamp({ withTimezone: true }),
};
