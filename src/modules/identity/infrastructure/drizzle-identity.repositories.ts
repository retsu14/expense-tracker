import "server-only";

import { and, count, desc, eq, ne, sql } from "drizzle-orm";

import type {
  RateLimiter,
  RecoveryCodeRepository,
  SessionRepository,
  UserRepository,
} from "@/modules/identity/domain/ports";
import type { Session } from "@/modules/identity/domain/session";
import type { User } from "@/modules/identity/domain/user";
import type { Db } from "@/shared/db/client";
import { DomainError } from "@/shared/kernel/result";

import { authAttempts, recoveryCodes, sessions, users } from "./identity.schema";

type UserRow = typeof users.$inferSelect;
type SessionRow = typeof sessions.$inferSelect;

const toUser = (r: UserRow): User => ({
  id: r.id,
  username: r.username,
  passwordHash: r.passwordHash,
  displayName: r.displayName,
  avatarKey: r.avatarKey,
  pigName: r.pigName,
  currency: r.currency,
  createdAt: r.createdAt,
});

const toSession = (r: SessionRow): Session => ({
  id: r.id,
  userId: r.userId,
  expiresAt: r.expiresAt,
  createdAt: r.createdAt,
  lastSeenAt: r.lastSeenAt,
  userAgent: r.userAgent,
});

const isUniqueViolation = (e: unknown): boolean =>
  typeof e === "object" &&
  e !== null &&
  ("code" in e ? e.code === "23505" : "cause" in e && isUniqueViolation(e.cause));

export function drizzleUserRepository(db: Db): UserRepository {
  const byUsername = (username: string) =>
    eq(sql`lower(${users.username})`, username.toLowerCase());

  return {
    async findById(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return row ? toUser(row) : null;
    },
    async findByUsername(username) {
      const [row] = await db.select().from(users).where(byUsername(username)).limit(1);
      return row ? toUser(row) : null;
    },
    async usernameExists(username) {
      const [row] = await db
        .select({ id: users.id })
        .from(users)
        .where(byUsername(username))
        .limit(1);
      return Boolean(row);
    },
    async create(user) {
      try {
        const [row] = await db.insert(users).values(user).returning();
        if (!row) throw new Error("Insert returned no row");
        return toUser(row);
      } catch (e) {
        if (isUniqueViolation(e)) {
          throw new DomainError("username_taken", "That username is taken.", {
            username: ["That username is taken."],
          });
        }
        throw e;
      }
    },
    async updatePassword(id, passwordHash) {
      await db.update(users).set({ passwordHash }).where(eq(users.id, id));
    },
    async updateProfile(id, patch) {
      const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning();
      if (!row) throw new DomainError("not_found", "Account not found.");
      return toUser(row);
    },
    async updateAvatar(id, avatarKey) {
      await db.update(users).set({ avatarKey }).where(eq(users.id, id));
    },
    async delete(id) {
      await db.delete(users).where(eq(users.id, id));
    },
  };
}

export function drizzleSessionRepository(db: Db): SessionRepository {
  return {
    async create(session) {
      await db.insert(sessions).values(session);
    },
    async findWithUser(id) {
      const [row] = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(eq(sessions.id, id))
        .limit(1);
      return row ? { session: toSession(row.session), user: toUser(row.user) } : null;
    },
    async listByUser(userId) {
      const rows = await db
        .select()
        .from(sessions)
        .where(and(eq(sessions.userId, userId), sql`${sessions.expiresAt} > now()`))
        .orderBy(desc(sessions.lastSeenAt));
      return rows.map(toSession);
    },
    async update(id, patch) {
      await db.update(sessions).set(patch).where(eq(sessions.id, id));
    },
    async delete(id) {
      await db.delete(sessions).where(eq(sessions.id, id));
    },
    async deleteForUser(userId, id) {
      const rows = await db
        .delete(sessions)
        .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
        .returning({ id: sessions.id });
      return rows.length > 0;
    },
    async deleteAllForUser(userId, exceptId) {
      await db
        .delete(sessions)
        .where(
          exceptId
            ? and(eq(sessions.userId, userId), ne(sessions.id, exceptId))
            : eq(sessions.userId, userId),
        );
    },
  };
}

export function drizzleRecoveryCodeRepository(db: Db): RecoveryCodeRepository {
  return {
    async replaceAll(userId, codeHashes) {
      await db.transaction(async (tx) => {
        await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId));
        await tx.insert(recoveryCodes).values(codeHashes.map((codeHash) => ({ userId, codeHash })));
      });
    },
    async consume(userId, codeHash) {
      const rows = await db
        .update(recoveryCodes)
        .set({ used: true, usedAt: new Date() })
        .where(
          and(
            eq(recoveryCodes.userId, userId),
            eq(recoveryCodes.codeHash, codeHash),
            eq(recoveryCodes.used, false),
          ),
        )
        .returning({ id: recoveryCodes.id });
      return rows.length > 0;
    },
    async countRemaining(userId) {
      const [row] = await db
        .select({ n: count() })
        .from(recoveryCodes)
        .where(and(eq(recoveryCodes.userId, userId), eq(recoveryCodes.used, false)));
      return row?.n ?? 0;
    },
  };
}

export function drizzleRateLimiter(db: Db): RateLimiter {
  return {
    async hit(key, limit, windowMs) {
      const windowSql = sql`${authAttempts.windowStart} < now() - make_interval(secs => ${windowMs / 1000})`;
      const [row] = await db
        .insert(authAttempts)
        .values({ key, count: 1 })
        .onConflictDoUpdate({
          target: authAttempts.key,
          set: {
            count: sql`case when ${windowSql} then 1 else ${authAttempts.count} + 1 end`,
            windowStart: sql`case when ${windowSql} then now() else ${authAttempts.windowStart} end`,
          },
        })
        .returning({ count: authAttempts.count, windowStart: authAttempts.windowStart });
      if (!row) return { allowed: true, retryAfterMs: 0 };
      const retryAfterMs = Math.max(0, row.windowStart.getTime() + windowMs - Date.now());
      return { allowed: row.count <= limit, retryAfterMs };
    },
    async reset(key) {
      await db.delete(authAttempts).where(eq(authAttempts.key, key));
    },
  };
}
