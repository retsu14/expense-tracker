import { createHash, randomBytes } from "node:crypto";

import type { Session } from "@/modules/identity/domain/session";
import type { User } from "@/modules/identity/domain/user";

import type { IdentityDeps } from "./deps";

export function createInMemoryDeps(start = new Date("2026-01-01T00:00:00Z")) {
  let now = start;
  let seq = 0;
  const users = new Map<string, User>();
  const sessions = new Map<string, Session>();
  const codes: { userId: string; hash: string; used: boolean }[] = [];
  const hits = new Map<string, number>();
  const objects = new Map<string, { size: number; contentType: string }>();

  const deps: IdentityDeps = {
    clock: { now: () => now },
    newId: () => `id-${++seq}`,
    hasher: {
      hash: (p) => Promise.resolve(`hashed:${p}`),
      verify: (h, p) => Promise.resolve(h === `hashed:${p}`),
    },
    tokens: {
      generateToken: () => randomBytes(32).toString("base64url"),
      hashToken: (t) => createHash("sha256").update(t).digest("hex"),
      randomBytes: (n) => new Uint8Array(randomBytes(n)),
    },
    rateLimiter: {
      hit: (key, limit) => {
        const count = (hits.get(key) ?? 0) + 1;
        hits.set(key, count);
        return Promise.resolve({ allowed: count <= limit, retryAfterMs: 60_000 });
      },
      reset: (key) => {
        hits.delete(key);
        return Promise.resolve();
      },
    },
    users: {
      findById: (id) => Promise.resolve(users.get(id) ?? null),
      findByUsername: (u) =>
        Promise.resolve([...users.values()].find((x) => x.username === u) ?? null),
      usernameExists: (u) => Promise.resolve([...users.values()].some((x) => x.username === u)),
      create: (u) => {
        const user: User = {
          ...u,
          avatarKey: null,
          pigName: "Oink",
          currency: "PHP",
          createdAt: now,
        };
        users.set(u.id, user);
        return Promise.resolve(user);
      },
      updatePassword: (id, passwordHash) => {
        const u = users.get(id);
        if (u) users.set(id, { ...u, passwordHash });
        return Promise.resolve();
      },
      updateProfile: (id, patch) => {
        const u = users.get(id);
        if (!u) throw new Error("missing");
        const next = { ...u, ...patch };
        users.set(id, next);
        return Promise.resolve(next);
      },
      updateAvatar: (id, avatarKey) => {
        const u = users.get(id);
        if (u) users.set(id, { ...u, avatarKey });
        return Promise.resolve();
      },
    },
    sessions: {
      create: (s) => {
        sessions.set(s.id, { ...s });
        return Promise.resolve();
      },
      findWithUser: (id) => {
        const session = sessions.get(id);
        const user = session && users.get(session.userId);
        return Promise.resolve(session && user ? { session: { ...session }, user } : null);
      },
      listByUser: (userId) =>
        Promise.resolve([...sessions.values()].filter((s) => s.userId === userId)),
      update: (id, patch) => {
        const s = sessions.get(id);
        if (s) sessions.set(id, { ...s, ...patch });
        return Promise.resolve();
      },
      delete: (id) => {
        sessions.delete(id);
        return Promise.resolve();
      },
      deleteForUser: (userId, id) => {
        const s = sessions.get(id);
        if (s?.userId !== userId) return Promise.resolve(false);
        sessions.delete(id);
        return Promise.resolve(true);
      },
      deleteAllForUser: (userId, exceptId) => {
        for (const [id, s] of sessions)
          if (s.userId === userId && id !== exceptId) sessions.delete(id);
        return Promise.resolve();
      },
    },
    recoveryCodes: {
      replaceAll: (userId, hashes) => {
        for (let i = codes.length - 1; i >= 0; i--)
          if (codes[i]?.userId === userId) codes.splice(i, 1);
        codes.push(...hashes.map((hash) => ({ userId, hash, used: false })));
        return Promise.resolve();
      },
      consume: (userId, hash) => {
        const c = codes.find((x) => x.userId === userId && x.hash === hash && !x.used);
        if (c) c.used = true;
        return Promise.resolve(Boolean(c));
      },
      countRemaining: (userId) =>
        Promise.resolve(codes.filter((c) => c.userId === userId && !c.used).length),
    },
    storage: {
      createUploadUrl: (key) => Promise.resolve({ url: `https://r2.test/${key}`, headers: {} }),
      head: (key) => Promise.resolve(objects.get(key) ?? null),
      delete: (key) => {
        objects.delete(key);
        return Promise.resolve();
      },
      publicUrl: (key) => Promise.resolve(`https://cdn.test/${key}`),
    },
  };

  return {
    deps,
    users,
    sessions,
    objects,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}
