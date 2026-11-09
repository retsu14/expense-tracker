"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";

import {
  changePassword,
  deleteAccount,
  listSessions,
  regenerateRecoveryCodes,
  removeAvatar,
  revokeOtherSessions,
  revokeSession,
  updateProfile,
  uploadAvatar,
} from "@/modules/identity/application/account.use-cases";
import {
  checkUsernameAvailability,
  type IssuedSession,
  login,
  logout,
  registerUser,
  resetPasswordWithRecoveryCode,
} from "@/modules/identity/application/auth.use-cases";
import { formToObject, runAction } from "@/shared/action";
import { identityDeps } from "@/shared/container";
import { ok, type ActionResult } from "@/shared/kernel/result";

import { requestMeta, requireUser } from "./dal";
import { SESSION_COOKIE, sessionCookieOptions } from "./session-cookie";

async function setSessionCookie(session: IssuedSession) {
  (await cookies()).set(SESSION_COOKIE, session.token, sessionCookieOptions());
}

function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function registerAction(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult<{ recoveryCodes: string[] }>> {
  return runAction(async () => {
    const result = await registerUser(identityDeps(), formToObject(form), await requestMeta());
    if (!result.ok) return result;
    await setSessionCookie(result.value);
    return ok({ recoveryCodes: result.value.recoveryCodes });
  });
}

export async function loginAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const res = await login(identityDeps(), formToObject(form), await requestMeta());
    if (!res.ok) return res;
    await setSessionCookie(res.value);
    return ok(undefined);
  });
  if (result.ok) redirect(safeNext(form.get("next")));
  return result;
}

export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await logout(identityDeps(), token);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}

export async function resetPasswordAction(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult<{ remainingCodes: number }>> {
  return runAction(async () => {
    const res = await resetPasswordWithRecoveryCode(
      identityDeps(),
      formToObject(form),
      await requestMeta(),
    );
    if (!res.ok) return res;
    await setSessionCookie(res.value);
    return ok({ remainingCodes: res.value.remainingCodes });
  });
}

export async function checkUsernameAction(username: string) {
  return checkUsernameAvailability(identityDeps(), username.slice(0, 40));
}

export async function changePasswordAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    return changePassword(identityDeps(), user.id, user.sessionId, formToObject(form));
  });
}

export async function regenerateRecoveryCodesAction(
  _prev: unknown,
  form: FormData,
): Promise<ActionResult<string[]>> {
  return runAction(async () => {
    const user = await requireUser();
    return regenerateRecoveryCodes(identityDeps(), user.id, formToObject(form));
  });
}

export async function updateProfileAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const res = await updateProfile(identityDeps(), user.id, formToObject(form));
    if (!res.ok) return res;
    refresh();
    return ok(undefined);
  });
}

export async function listSessionsAction() {
  const user = await requireUser();
  return listSessions(identityDeps(), user.id, user.sessionId);
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    const res = await revokeSession(identityDeps(), user.id, sessionId);
    if (res.ok) refresh();
    return res;
  });
}

export async function revokeOtherSessionsAction(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await revokeOtherSessions(identityDeps(), user.id, user.sessionId);
    refresh();
    return ok(undefined);
  });
}

export async function uploadAvatarAction(form: FormData) {
  return runAction(async () => {
    const user = await requireUser();
    const file = form.get("file");
    const bytes =
      file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : new Uint8Array();
    const res = await uploadAvatar(identityDeps(), user.id, bytes);
    if (res.ok) refresh();
    return res;
  });
}

export async function removeAvatarAction(): Promise<ActionResult> {
  return runAction(async () => {
    const user = await requireUser();
    await removeAvatar(identityDeps(), user.id);
    refresh();
    return ok(undefined);
  });
}

export async function deleteAccountAction(_prev: unknown, form: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const user = await requireUser();
    return deleteAccount(identityDeps(), user.id, formToObject(form));
  });
  if (result.ok) {
    (await cookies()).delete(SESSION_COOKIE);
    redirect("/register?deleted=1");
  }
  return result;
}
