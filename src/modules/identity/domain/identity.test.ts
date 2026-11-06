import { describe, expect, it } from "vitest";

import { passwordStrength, validatePassword } from "./password";
import { generateRecoveryCode, normalizeRecoveryCode } from "./recovery-code";
import { validateUsername } from "./user";

describe("validateUsername", () => {
  it("normalizes and accepts valid usernames", () => {
    expect(validateUsername("  Juan_123 ")).toEqual({ ok: true, value: "juan_123" });
  });

  it("rejects bad length, characters and reserved names", () => {
    expect(validateUsername("ab").ok).toBe(false);
    expect(validateUsername("a".repeat(21)).ok).toBe(false);
    expect(validateUsername("juan.dc").ok).toBe(false);
    expect(validateUsername("Admin").ok).toBe(false);
  });
});

describe("validatePassword", () => {
  it("enforces length, common list and username", () => {
    expect(validatePassword("short", "juan").ok).toBe(false);
    expect(validatePassword("password1", "juan").ok).toBe(false);
    expect(validatePassword("myjuan2024!", "juan").ok).toBe(false);
    expect(validatePassword("piggy-bank-42", "juan").ok).toBe(true);
  });

  it("scores strength", () => {
    expect(passwordStrength("password")).toBe(0);
    expect(passwordStrength("abcdefgh")).toBe(1);
    expect(passwordStrength("Piggy-Bank-2024")).toBe(4);
  });
});

describe("recovery codes", () => {
  const bytes = (size: number) => Uint8Array.from({ length: size }, (_, i) => i * 7);

  it("generates grouped codes from an unambiguous alphabet", () => {
    const code = generateRecoveryCode(bytes);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
  });

  it("normalizes user input", () => {
    expect(normalizeRecoveryCode(" abcde fghjk ")).toBe("ABCDE-FGHJK");
    expect(normalizeRecoveryCode("abcde-fghjk")).toBe("ABCDE-FGHJK");
    expect(normalizeRecoveryCode("abc")).toBeNull();
  });
});
