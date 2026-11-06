import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

export type User = {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  avatarKey: string | null;
  pigName: string;
  currency: "PHP";
  createdAt: Date;
};

export type PublicUser = Omit<User, "passwordHash">;

export const toPublicUser = ({ passwordHash: _, ...user }: User): PublicUser => user;

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const RESERVED = new Set([
  "admin",
  "root",
  "oink",
  "support",
  "system",
  "api",
  "null",
  "undefined",
]);

export function normalizeUsername(input: string) {
  return input.trim().toLowerCase();
}

export function validateUsername(input: string): Result<string> {
  const username = normalizeUsername(input);
  if (!USERNAME_PATTERN.test(username)) {
    return err(
      new DomainError("invalid_username", "Use 3–20 letters, numbers or underscores.", {
        username: ["Use 3–20 letters, numbers or underscores."],
      }),
    );
  }
  if (RESERVED.has(username)) {
    return err(
      new DomainError("username_taken", "That username isn't available.", {
        username: ["That username isn't available."],
      }),
    );
  }
  return ok(username);
}

export function validateDisplayName(input: string): Result<string> {
  const name = input.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 40) {
    return err(
      new DomainError("invalid_display_name", "Name must be 1–40 characters.", {
        displayName: ["Name must be 1–40 characters."],
      }),
    );
  }
  return ok(name);
}

export function validatePigName(input: string): Result<string> {
  const name = input.trim();
  if (name.length < 1 || name.length > 20) {
    return err(
      new DomainError("invalid_pig_name", "Pig name must be 1–20 characters.", {
        pigName: ["Pig name must be 1–20 characters."],
      }),
    );
  }
  return ok(name);
}
