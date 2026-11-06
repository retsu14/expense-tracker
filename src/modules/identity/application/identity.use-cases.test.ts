import { describe, expect, it } from "vitest";

import { SESSION_TTL_MS } from "@/modules/identity/domain/session";

import { changePassword, confirmAvatar, createAvatarUpload } from "./account.use-cases";
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

  it("only confirms avatars uploaded under the user's own prefix", async () => {
    const { deps, users, objects } = await setup();
    const userId = [...users.keys()][0] ?? "";
    const upload = await createAvatarUpload(deps, userId, {
      contentType: "image/webp",
      size: 5000,
    });
    if (!upload.ok) throw upload.error;

    objects.set(upload.value.key, { size: 5000, contentType: "image/webp" });
    expect((await confirmAvatar(deps, userId, { key: upload.value.key })).ok).toBe(true);
    expect(users.get(userId)?.avatarKey).toBe(upload.value.key);

    const foreign = await confirmAvatar(deps, userId, { key: "avatars/someone-else/x.webp" });
    expect(foreign.ok).toBe(false);
  });
});
