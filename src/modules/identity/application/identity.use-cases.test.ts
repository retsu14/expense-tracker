import { describe, expect, it } from "vitest";

import { SESSION_TTL_MS } from "@/modules/identity/domain/session";

import { changePassword, readAvatar, uploadAvatar, deleteAccount } from "./account.use-cases";
import {
  login,
  logout,
  registerUser,
  resetPasswordWithRecoveryCode,
  validateSession,
} from "./auth.use-cases";
import { createInMemoryDeps } from "./in-memory";

const meta = { ip: "1.1.1.1", userAgent: "vitest" };
const creds = { username: "Juan_DC", password: "piggy-bank-42", confirmPassword: "piggy-bank-42" };

async function setup() {
  const env = createInMemoryDeps();
  const reg = await registerUser(env.deps, creds, meta);
  if (!reg.ok) throw reg.error;
  return { ...env, reg: reg.value };
}

describe("registerUser", () => {
  it("creates a lowercase user, 8 recovery codes and a session", async () => {
    const { users, sessions, reg } = await setup();
    expect([...users.values()][0]?.username).toBe("juan_dc");
    expect(reg.recoveryCodes).toHaveLength(8);
    expect(sessions.size).toBe(1);
    expect(sessions.has(reg.token)).toBe(false);
  });

  it("rejects taken usernames and mismatched passwords", async () => {
    const { deps } = await setup();
    const taken = await registerUser(deps, { ...creds, username: "JUAN_dc" }, meta);
    expect(!taken.ok && taken.error.code).toBe("username_taken");

    const mismatch = await registerUser(
      deps,
      { ...creds, username: "maria", confirmPassword: "nope" },
      meta,
    );
    expect(!mismatch.ok && mismatch.error.fieldErrors?.confirmPassword).toBeTruthy();
  });
});

describe("login", () => {
  it("logs in case-insensitively and rejects wrong passwords generically", async () => {
    const { deps } = await setup();
    expect((await login(deps, { username: "JUAN_DC", password: creds.password }, meta)).ok).toBe(
      true,
    );

    const wrong = await login(deps, { username: "juan_dc", password: "nope-nope" }, meta);
    const unknown = await login(deps, { username: "ghost", password: "nope-nope" }, meta);
    expect(!wrong.ok && wrong.error.message).toBe("Wrong username or password.");
    expect(!unknown.ok && unknown.error.message).toBe("Wrong username or password.");
  });

  it("rate limits repeated failures per username", async () => {
    const { deps } = await setup();
    for (let i = 0; i < 10; i++) {
      await login(deps, { username: "juan_dc", password: "bad-password" }, meta);
    }
    const blocked = await login(deps, { username: "juan_dc", password: creds.password }, meta);
    expect(!blocked.ok && blocked.error.code).toBe("rate_limited");
  });
});

describe("sessions", () => {
  it("validates, slides expiry and expires", async () => {
    const { deps, reg, advance } = await setup();
    expect((await validateSession(deps, reg.token))?.user.username).toBe("juan_dc");

    advance(SESSION_TTL_MS - 1000);
    const refreshed = await validateSession(deps, reg.token);
    expect(refreshed?.session.expiresAt.getTime()).toBeGreaterThan(reg.expiresAt.getTime());

    advance(SESSION_TTL_MS + 1000);
    expect(await validateSession(deps, reg.token)).toBeNull();
  });

  it("logout removes the session", async () => {
    const { deps, reg } = await setup();
    await logout(deps, reg.token);
    expect(await validateSession(deps, reg.token)).toBeNull();
  });
});

describe("resetPasswordWithRecoveryCode", () => {
  it("resets with a valid code once, revoking old sessions", async () => {
    const { deps, reg } = await setup();
    const code = reg.recoveryCodes[0]?.toLowerCase().replace("-", " ") ?? "";
    const input = {
      username: "juan_dc",
      code,
      newPassword: "new-piggy-99",
      confirmPassword: "new-piggy-99",
    };

    const res = await resetPasswordWithRecoveryCode(deps, input, meta);
    expect(res.ok && res.value.remainingCodes).toBe(7);
    expect(await validateSession(deps, reg.token)).toBeNull();
    expect((await login(deps, { username: "juan_dc", password: "new-piggy-99" }, meta)).ok).toBe(
      true,
    );

    const reused = await resetPasswordWithRecoveryCode(deps, input, meta);
    expect(!reused.ok && reused.error.code).toBe("invalid_recovery");
  });

  it("rejects unknown usernames with the same message", async () => {
    const { deps, reg } = await setup();
    const res = await resetPasswordWithRecoveryCode(
      deps,
      {
        username: "ghost",
        code: reg.recoveryCodes[0],
        newPassword: "new-piggy-99",
        confirmPassword: "new-piggy-99",
      },
      meta,
    );
    expect(!res.ok && res.error.code).toBe("invalid_recovery");
  });
});

describe("account", () => {
  it("changePassword keeps only the current session", async () => {
    const { deps, reg, sessions } = await setup();
    await login(deps, { username: "juan_dc", password: creds.password }, meta);
    expect(sessions.size).toBe(2);

    const res = await changePassword(deps, [...sessions.values()][0]?.userId ?? "", reg.sessionId, {
      currentPassword: creds.password,
      newPassword: "brand-new-77",
      confirmPassword: "brand-new-77",
    });
    expect(res.ok).toBe(true);
    expect([...sessions.keys()]).toEqual([reg.sessionId]);
  });

  it("uploads real images and serves only the user's own avatar", async () => {
    const { deps, users, objects } = await setup();
    const userId = [...users.keys()][0] ?? "";
    const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0]);

    const res = await uploadAvatar(deps, userId, webp);
    if (!res.ok) throw res.error;
    const key = users.get(userId)?.avatarKey ?? "";
    expect(key.startsWith(`avatars/${userId}/`)).toBe(true);
    expect(objects.get(key)?.contentType).toBe("image/webp");

    const file = key.split("/").pop() ?? "";
    expect((await readAvatar(deps, userId, file))?.contentType).toBe("image/webp");
    expect(await readAvatar(deps, "someone-else", file)).toBeNull();
    expect(await readAvatar(deps, userId, "../secret.webp")).toBeNull();

    const again = await uploadAvatar(deps, userId, webp);
    expect(again.ok).toBe(true);
    expect(objects.has(key)).toBe(false);
  });

  it("rejects files that are not images or are too big", async () => {
    const { deps, users } = await setup();
    const userId = [...users.keys()][0] ?? "";
    const fake = new TextEncoder().encode("<svg onload=alert(1)>");
    expect((await uploadAvatar(deps, userId, fake)).ok).toBe(false);
    expect((await uploadAvatar(deps, userId, new Uint8Array())).ok).toBe(false);
    const huge = new Uint8Array(3 * 1024 * 1024);
    huge.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect((await uploadAvatar(deps, userId, huge)).ok).toBe(false);
  });
});

describe("deleteAccount", () => {
  it("requires the matching username and password", async () => {
    const { deps, users } = await setup();
    const userId = [...users.keys()][0] ?? "";
    const wrongName = await deleteAccount(deps, userId, {
      password: creds.password,
      confirmUsername: "nope",
    });
    expect(!wrongName.ok && wrongName.error.code).toBe("confirm_mismatch");
    const wrongPass = await deleteAccount(deps, userId, {
      password: "bad-pass-1",
      confirmUsername: "JUAN_DC",
    });
    expect(wrongPass.ok).toBe(false);
    expect(
      (await deleteAccount(deps, userId, { password: creds.password, confirmUsername: "JUAN_DC" }))
        .ok,
    ).toBe(true);
    expect(users.size).toBe(0);
  });
});
