import { validatePassword } from "@/modules/identity/domain/password";
import {
  generateRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_CODE_COUNT,
} from "@/modules/identity/domain/recovery-code";
import {
  isExpired,
  newExpiry,
  type Session,
  shouldRefresh,
  shouldTouch,
} from "@/modules/identity/domain/session";
import {
  normalizeUsername,
  type PublicUser,
  toPublicUser,
  validateUsername,
} from "@/modules/identity/domain/user";
import { DomainError, err, ok, type Result } from "@/shared/kernel/result";
import { parse } from "@/shared/validation";

import type { IdentityDeps, RequestMeta } from "./deps";
import { loginSchema, registerSchema, resetPasswordSchema } from "./schemas";

const MINUTE = 60_000;
let dummyHash: Promise<string> | undefined;

export type IssuedSession = { token: string; sessionId: string; expiresAt: Date };

const invalidCredentials = () =>
  err(new DomainError("invalid_credentials", "Wrong username or password."));

const tooManyAttempts = (retryAfterMs: number) =>
  err(
    new DomainError(
      "rate_limited",
      `Too many attempts. Try again in ${Math.max(1, Math.ceil(retryAfterMs / MINUTE))} min.`,
    ),
  );

export async function issueSession(
  deps: IdentityDeps,
  userId: string,
  meta: Pick<RequestMeta, "userAgent">,
): Promise<IssuedSession> {
  const now = deps.clock.now();
  const token = deps.tokens.generateToken();
  const session: Session = {
    id: deps.tokens.hashToken(token),
    userId,
    expiresAt: newExpiry(now),
    createdAt: now,
    lastSeenAt: now,
    userAgent: meta.userAgent?.slice(0, 300) ?? null,
  };
  await deps.sessions.create(session);
  return { token, sessionId: session.id, expiresAt: session.expiresAt };
}

export async function createRecoveryCodes(deps: IdentityDeps, userId: string) {
  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    generateRecoveryCode((n) => deps.tokens.randomBytes(n)),
  );
  await deps.recoveryCodes.replaceAll(
    userId,
    codes.map((c) => deps.tokens.hashToken(c)),
  );
  return codes;
}

export async function registerUser(
  deps: IdentityDeps,
  input: unknown,
  meta: RequestMeta,
): Promise<Result<IssuedSession & { recoveryCodes: string[] }>> {
  const limit = await deps.rateLimiter.hit(`register:${meta.ip}`, 10, 60 * MINUTE);
  if (!limit.allowed) return tooManyAttempts(limit.retryAfterMs);

  const parsed = parse(registerSchema, input);
  if (!parsed.ok) return parsed;

  const username = validateUsername(parsed.value.username);
  if (!username.ok) return username;

  const password = validatePassword(parsed.value.password, username.value);
  if (!password.ok) return password;

  if (await deps.users.usernameExists(username.value)) {
    return err(
      new DomainError("username_taken", "That username is taken.", {
        username: ["That username is taken."],
      }),
    );
  }

  const user = await deps.users.create({
    id: deps.newId(),
    username: username.value,
    passwordHash: await deps.hasher.hash(password.value),
    displayName: username.value,
  });

  const recoveryCodes = await createRecoveryCodes(deps, user.id);
  const session = await issueSession(deps, user.id, meta);
  return ok({ ...session, recoveryCodes });
}

export async function login(
  deps: IdentityDeps,
  input: unknown,
  meta: RequestMeta,
): Promise<Result<IssuedSession>> {
  const parsed = parse(loginSchema, input);
  if (!parsed.ok) return parsed;

  const username = normalizeUsername(parsed.value.username);
  const byUser = await deps.rateLimiter.hit(`login:${username}`, 10, 15 * MINUTE);
  const byIp = await deps.rateLimiter.hit(`login-ip:${meta.ip}`, 50, 15 * MINUTE);
  if (!byUser.allowed || !byIp.allowed) {
    return tooManyAttempts(Math.max(byUser.retryAfterMs, byIp.retryAfterMs));
  }

  const user = await deps.users.findByUsername(username);
  if (!user) {
    dummyHash ??= deps.hasher.hash("oink-dummy-password");
    await deps.hasher.verify(await dummyHash, parsed.value.password);
    return invalidCredentials();
  }

  if (!(await deps.hasher.verify(user.passwordHash, parsed.value.password))) {
    return invalidCredentials();
  }

  await deps.rateLimiter.reset(`login:${username}`);
  return ok(await issueSession(deps, user.id, meta));
}

export async function logout(deps: IdentityDeps, token: string) {
  await deps.sessions.delete(deps.tokens.hashToken(token));
}

export async function validateSession(
  deps: IdentityDeps,
  token: string,
): Promise<{ user: PublicUser; session: Session } | null> {
  const found = await deps.sessions.findWithUser(deps.tokens.hashToken(token));
  if (!found) return null;

  const now = deps.clock.now();
  const { session, user } = found;
  if (isExpired(session, now)) {
    await deps.sessions.delete(session.id);
    return null;
  }

  if (shouldRefresh(session, now) || shouldTouch(session, now)) {
    const patch = shouldRefresh(session, now)
      ? { expiresAt: newExpiry(now), lastSeenAt: now }
      : { lastSeenAt: now };
    await deps.sessions.update(session.id, patch);
    Object.assign(session, patch);
  }

  return { user: toPublicUser(user), session };
}

export async function resetPasswordWithRecoveryCode(
  deps: IdentityDeps,
  input: unknown,
  meta: RequestMeta,
): Promise<Result<IssuedSession & { remainingCodes: number }>> {
  const parsed = parse(resetPasswordSchema, input);
  if (!parsed.ok) return parsed;

  const username = normalizeUsername(parsed.value.username);
  const byUser = await deps.rateLimiter.hit(`reset:${username}`, 5, 15 * MINUTE);
  const byIp = await deps.rateLimiter.hit(`reset-ip:${meta.ip}`, 20, 15 * MINUTE);
  if (!byUser.allowed || !byIp.allowed) {
    return tooManyAttempts(Math.max(byUser.retryAfterMs, byIp.retryAfterMs));
  }

  const invalid = err(
    new DomainError("invalid_recovery", "That username and recovery code don't match."),
  );
  const user = await deps.users.findByUsername(username);
  const code = normalizeRecoveryCode(parsed.value.code);
  if (!user || !code) return invalid;

  const password = validatePassword(parsed.value.newPassword, user.username, "newPassword");
  if (!password.ok) return password;

  if (!(await deps.recoveryCodes.consume(user.id, deps.tokens.hashToken(code)))) return invalid;

  await deps.users.updatePassword(user.id, await deps.hasher.hash(password.value));
  await deps.sessions.deleteAllForUser(user.id);
  await deps.rateLimiter.reset(`reset:${username}`);
  await deps.rateLimiter.reset(`login:${username}`);

  const session = await issueSession(deps, user.id, meta);
  const remainingCodes = await deps.recoveryCodes.countRemaining(user.id);
  return ok({ ...session, remainingCodes });
}

export async function checkUsernameAvailability(deps: IdentityDeps, input: string) {
  const username = validateUsername(input);
  if (!username.ok) return { available: false, message: username.error.message };
  const taken = await deps.users.usernameExists(username.value);
  return taken
    ? { available: false, message: "That username is taken." }
    : { available: true, message: "Username is available." };
}
