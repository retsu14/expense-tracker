import { z } from "zod";

import { PASSWORD_MAX } from "@/modules/identity/domain/password";

const text = (max: number) => z.string().trim().max(max);
const password = z.string().max(PASSWORD_MAX, "Password is too long.");

const matching = <T extends z.ZodRawShape>(shape: T, field: keyof T & string, confirm: string) =>
  z.object(shape).refine((v: Record<string, unknown>) => v[field] === v[confirm], {
    message: "Passwords don't match.",
    path: [confirm],
  });

export const registerSchema = matching(
  {
    username: text(40).min(1, "Pick a username."),
    password: password.min(1, "Enter a password."),
    confirmPassword: password,
  },
  "password",
  "confirmPassword",
);

export const loginSchema = z.object({
  username: text(40).min(1, "Enter your username."),
  password: password.min(1, "Enter your password."),
});

export const resetPasswordSchema = matching(
  {
    username: text(40).min(1, "Enter your username."),
    code: text(32).min(1, "Enter one of your recovery codes."),
    newPassword: password.min(1, "Enter a new password."),
    confirmPassword: password,
  },
  "newPassword",
  "confirmPassword",
);

export const changePasswordSchema = matching(
  {
    currentPassword: password.min(1, "Enter your current password."),
    newPassword: password.min(1, "Enter a new password."),
    confirmPassword: password,
  },
  "newPassword",
  "confirmPassword",
);

export const confirmPasswordSchema = z.object({
  password: password.min(1, "Enter your password."),
});

export const deleteAccountSchema = z.object({
  password: password.min(1, "Enter your password."),
  confirmUsername: text(40).min(1, "Type your username to confirm."),
});

export const profileSchema = z.object({
  displayName: text(80),
  pigName: text(40),
});

export const AVATAR_TYPES = ["image/webp", "image/jpeg", "image/png"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const avatarUploadSchema = z.object({
  contentType: z.enum(AVATAR_TYPES),
  size: z.number().int().positive().max(AVATAR_MAX_BYTES, "Image must be 2 MB or smaller."),
});

export const avatarConfirmSchema = z.object({ key: z.string().min(1).max(200) });
