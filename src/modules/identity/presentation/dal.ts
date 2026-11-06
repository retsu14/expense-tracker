import "server-only";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { RequestMeta } from "@/modules/identity/application/deps";
import { validateSession } from "@/modules/identity/application/auth.use-cases";
import { identityDeps } from "@/shared/container";

import { SESSION_COOKIE } from "./session-cookie";

export type CurrentUser = {
  id: string;
  sessionId: string;
  username: string;
  displayName: string;
  pigName: string;
  avatarUrl: string | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const deps = identityDeps();
  const result = await validateSession(deps, token);
  if (!result) return null;

  const { user, session } = result;
  return {
    id: user.id,
    sessionId: session.id,
    username: user.username,
    displayName: user.displayName,
    pigName: user.pigName,
    avatarUrl: user.avatarKey ? await deps.storage.publicUrl(user.avatarKey) : null,
  };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/expired");
  return user;
}

export async function requestMeta(): Promise<RequestMeta> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown";
  return { ip, userAgent: h.get("user-agent") };
}
