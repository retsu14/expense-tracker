import { z } from "zod";

import { ACCOUNT_TYPES } from "@/modules/ledger/domain/account";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_KINDS } from "@/modules/ledger/domain/category";
import { NOTE_MAX, TRANSACTION_KINDS } from "@/modules/ledger/domain/transaction";

const uuid = z.uuid("Pick an option.");
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");
const hex = z.string().regex(/^#[0-9a-f]{6}$/i);
const optionalUuid = z
  .string()
  .optional()
  .transform((v) => (v === undefined || v === "" ? null : v))
  .pipe(uuid.nullable());

export const amountText = z.string().trim().min(1, "Enter an amount.").max(60);

export const transactionInput = z.object({
  kind: z.enum(TRANSACTION_KINDS),
  amount: amountText,
  accountId: uuid,
  toAccountId: optionalUuid,
  categoryId: optionalUuid,
  fee: z.string().trim().max(60).optional().default(""),
  date: ymd,
  time: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  note: z.string().trim().max(NOTE_MAX, `Keep notes under ${NOTE_MAX} characters.`).default(""),
  idempotencyKey: z.string().min(8).max(64).optional(),
});
export type TransactionInput = z.input<typeof transactionInput>;

export const accountInput = z.object({
  name: z.string(),
  type: z.enum(ACCOUNT_TYPES),
  openingBalance: z.string().trim().max(40).default("0"),
  color: hex,
});
export type AccountInput = z.input<typeof accountInput>;

export const categoryInput = z.object({
  name: z.string(),
  kind: z.enum(CATEGORY_KINDS),
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_COLORS),
});
export type CategoryInput = z.input<typeof categoryInput>;

const payday = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("semi_monthly"),
    days: z.tuple([z.number().int().min(1).max(31), z.number().int().min(1).max(31)]),
  }),
  z.object({ type: z.literal("monthly"), day: z.number().int().min(1).max(31) }),
  z.object({ type: z.literal("weekly"), weekday: z.number().int().min(0).max(6) }),
  z.object({ type: z.literal("none") }),
]);

export const onboardingInput = z.object({
  wallets: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(ACCOUNT_TYPES),
        openingBalance: z.string().trim().max(40).default("0"),
        color: hex,
      }),
    )
    .min(1, "Add at least one wallet.")
    .max(10),
  payday,
  monthlyIncome: z.string().trim().max(40).default(""),
});
export type OnboardingInput = z.input<typeof onboardingInput>;

export const templateInput = z.object({
  name: z.string().trim().min(1, "Name your favorite.").max(24),
  kind: z.enum(["expense", "income"]),
  amount: amountText,
  categoryId: uuid,
  accountId: optionalUuid,
  note: z.string().trim().max(NOTE_MAX).default(""),
});
export type TemplateInput = z.input<typeof templateInput>;

export const idList = z.array(uuid).min(1).max(100);
