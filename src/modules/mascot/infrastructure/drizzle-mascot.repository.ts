import "server-only";

import { eq } from "drizzle-orm";

import { isOutfit } from "@/modules/mascot/domain/milestones";
import type { MascotRepository } from "@/modules/mascot/domain/ports";
import type { Db } from "@/shared/db/client";

import { pigProgress } from "./mascot.schema";

export function drizzleMascotRepository(db: Db): MascotRepository {
  return {
    async get(userId) {
      const [row] = await db.select().from(pigProgress).where(eq(pigProgress.userId, userId));
      if (!row) return null;
      return {
        best: row.bestBalance,
        outfit: isOutfit(row.outfit) ? row.outfit : null,
        celebrated: row.celebrated,
      };
    },
    async save(userId, p) {
      const values = { bestBalance: p.best, outfit: p.outfit, celebrated: p.celebrated };
      await db
        .insert(pigProgress)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: pigProgress.userId, set: values });
    },
  };
}
