import { sniffImageType } from "@/modules/identity/domain/image";
import { validatePassword } from "@/modules/identity/domain/password";
import {
  type PublicUser,
  toPublicUser,
  validateDisplayName,
  validatePigName,
} from "@/modules/identity/domain/user";
import { DomainError, err, ok, type Result } from "@/shared/kernel/result";
import { parse } from "@/shared/validation";

import { createRecoveryCodes } from "./auth.use-cases";
import type { IdentityDeps } from "./deps";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TYPES,
  changePasswordSchema,
  confirmPasswordSchema,
  deleteAccountSchema,
  profileSchema,
} from "./schemas";

const notFound = () => err(new DomainError("not_found", "Account not found."));
const wrongPassword = (field: string) =>
  err(
    new DomainError("invalid_password", "That password is incorrect.", {
      [field]: ["That password is incorrect."],
    }),
  );

const EXT: Record<(typeof AVATAR_TYPES)[number], string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

export async function changePassword(
  deps: IdentityDeps,
  userId: string,
  currentSessionId: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(changePasswordSchema, input);
  if (!parsed.ok) return parsed;

  const user = await deps.users.findById(userId);
  if (!user) return notFound();
  if (!(await deps.hasher.verify(user.passwordHash, parsed.value.currentPassword))) {
    return wrongPassword("currentPassword");
  }

  const password = validatePassword(parsed.value.newPassword, user.username, "newPassword");
  if (!password.ok) return password;

  await deps.users.updatePassword(userId, await deps.hasher.hash(password.value));
  await deps.sessions.deleteAllForUser(userId, currentSessionId);
  return ok(undefined);
}

export async function regenerateRecoveryCodes(
  deps: IdentityDeps,
  userId: string,
  input: unknown,
): Promise<Result<string[]>> {
  const parsed = parse(confirmPasswordSchema, input);
  if (!parsed.ok) return parsed;

  const user = await deps.users.findById(userId);
  if (!user) return notFound();
  if (!(await deps.hasher.verify(user.passwordHash, parsed.value.password))) {
    return wrongPassword("password");
  }
  return ok(await createRecoveryCodes(deps, userId));
}

export async function countRecoveryCodes(deps: IdentityDeps, userId: string) {
  return deps.recoveryCodes.countRemaining(userId);
}

export async function listSessions(deps: IdentityDeps, userId: string, currentId: string) {
  const sessions = await deps.sessions.listByUser(userId);
  return sessions
    .map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastSeenAt: s.lastSeenAt,
      current: s.id === currentId,
    }))
    .sort((a, b) => Number(b.current) - Number(a.current) || +b.lastSeenAt - +a.lastSeenAt);
}

export async function revokeSession(
  deps: IdentityDeps,
  userId: string,
  sessionId: string,
): Promise<Result<void>> {
  const deleted = await deps.sessions.deleteForUser(userId, sessionId);
  return deleted ? ok(undefined) : err(new DomainError("not_found", "Session not found."));
}

export async function revokeOtherSessions(deps: IdentityDeps, userId: string, currentId: string) {
  await deps.sessions.deleteAllForUser(userId, currentId);
}

export async function updateProfile(
  deps: IdentityDeps,
  userId: string,
  input: unknown,
): Promise<Result<PublicUser>> {
  const parsed = parse(profileSchema, input);
  if (!parsed.ok) return parsed;

  const displayName = validateDisplayName(parsed.value.displayName);
  if (!displayName.ok) return displayName;
  const pigName = validatePigName(parsed.value.pigName);
  if (!pigName.ok) return pigName;

  const user = await deps.users.updateProfile(userId, {
    displayName: displayName.value,
    pigName: pigName.value,
  });
  return ok(toPublicUser(user));
}

export async function uploadAvatar(
  deps: IdentityDeps,
  userId: string,
  bytes: Uint8Array,
): Promise<Result<string>> {
  if (bytes.length === 0 || bytes.length > AVATAR_MAX_BYTES)
    return err(new DomainError("invalid_upload", "Image must be 2 MB or smaller."));
  const type = sniffImageType(bytes);
  if (!type || !AVATAR_TYPES.includes(type))
    return err(new DomainError("invalid_upload", "Please choose a PNG, JPEG or WebP image."));

  const user = await deps.users.findById(userId);
  if (!user) return notFound();

  const key = `avatars/${userId}/${deps.newId()}.${EXT[type]}`;
  await deps.storage.put(key, bytes, type);
  await deps.users.updateAvatar(userId, key);
  if (user.avatarKey && user.avatarKey !== key) {
    await deps.storage.delete(user.avatarKey).catch(() => undefined);
  }
  return ok(await deps.storage.publicUrl(key));
}

export async function removeAvatar(deps: IdentityDeps, userId: string) {
  const user = await deps.users.findById(userId);
  if (!user?.avatarKey) return;
  await deps.users.updateAvatar(userId, null);
  await deps.storage.delete(user.avatarKey).catch(() => undefined);
}

export async function deleteAccount(
  deps: IdentityDeps,
  userId: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(deleteAccountSchema, input);
  if (!parsed.ok) return parsed;
  const user = await deps.users.findById(userId);
  if (!user) return notFound();
  if (parsed.value.confirmUsername.trim().toLowerCase() !== user.username) {
    return err(
      new DomainError("confirm_mismatch", "Username doesn't match.", {
        confirmUsername: ["Username doesn't match."],
      }),
    );
  }
  if (!(await deps.hasher.verify(user.passwordHash, parsed.value.password))) {
    return wrongPassword("password");
  }
  if (user.avatarKey) await deps.storage.delete(user.avatarKey).catch(() => undefined);
  await deps.users.delete(userId);
  return ok(undefined);
}

const AVATAR_FILE = /^[a-z0-9-]{1,64}\.(webp|jpg|png)$/i;

export async function readAvatar(deps: IdentityDeps, userId: string, file: string) {
  if (!AVATAR_FILE.test(file)) return null;
  return deps.storage.get(`avatars/${userId}/${file}`);
}
