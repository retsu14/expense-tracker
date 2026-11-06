import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const COMMON = new Set([
  "password",
  "password1",
  "12345678",
  "123456789",
  "qwertyuiop",
  "iloveyou",
  "11111111",
  "abcd1234",
  "passw0rd",
]);

export type PasswordStrength = 0 | 1 | 2 | 3 | 4;

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN || COMMON.has(password.toLowerCase())) return 0;
  let score = 0;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.max(1, score) as PasswordStrength;
}

export function validatePassword(
  password: string,
  username: string,
  field = "password",
): Result<string> {
  const fail = (message: string) =>
    err(new DomainError("weak_password", message, { [field]: [message] }));

  if (password.length < PASSWORD_MIN) return fail(`Use at least ${PASSWORD_MIN} characters.`);
  if (password.length > PASSWORD_MAX) return fail(`Use at most ${PASSWORD_MAX} characters.`);
  if (COMMON.has(password.toLowerCase())) return fail("That password is too common.");
  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    return fail("Password can't contain your username.");
  }
  return ok(password);
}
