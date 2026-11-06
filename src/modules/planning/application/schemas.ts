import { z } from "zod";

import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/modules/ledger/domain/category";

const uuid = z.uuid("Pick an option.");
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");
const amount = z.string().trim().min(1, "Enter an amount.").max(60);

export const budgetInput = z.object({
  categoryId: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .pipe(uuid.nullable()),
  amount,
  period: z.enum(["monthly", "pay_cycle"]),
  rollover: z.boolean().default(false),
  alertPct: z.coerce.number().int(),
});

const schedule = z.discriminatedUnion("type", [
  z.object({ type: z.literal("monthly"), day: z.number().int().min(1).max(31) }),
  z.object({
    type: z.literal("semi_monthly"),
    days: z.tuple([z.number().int().min(1).max(31), z.number().int().min(1).max(31)]),
  }),
  z.object({ type: z.literal("weekly"), weekday: z.number().int().min(0).max(6) }),
  z.object({
    type: z.literal("yearly"),
    month: z.number().int().min(1).max(12),
    day: z.number().int().min(1).max(31),
  }),
]);

export const recurringInput = z.object({
  kind: z.enum(["expense", "income"]),
  name: z.string().trim().min(1, "Give it a name.").max(40),
  amount,
  accountId: uuid,
  categoryId: uuid,
  schedule,
  startDate: ymd,
  autoPost: z.boolean().default(false),
  remindDays: z.number().int().min(0).max(14).default(3),
});

export const markPaidInput = z.object({
  recurringId: uuid,
  dueDate: ymd,
  amount: z.string().trim().max(60).optional(),
  accountId: uuid.optional(),
});

export const goalInput = z.object({
  name: z.string().trim().min(1, "Name your goal.").max(40),
  target: amount,
  deadline: z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : v))
    .pipe(ymd.nullable()),
  icon: z.enum(CATEGORY_ICONS),
  color: z.enum(CATEGORY_COLORS),
});

export const contributionInput = z.object({
  goalId: uuid,
  amount,
  direction: z.enum(["add", "withdraw"]),
  note: z.string().trim().max(80).default(""),
});
