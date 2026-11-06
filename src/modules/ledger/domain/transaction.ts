import { DomainError, err, ok, type Result } from "@/shared/kernel/result";

import type { Category } from "./category";

export const TRANSACTION_KINDS = ["expense", "income", "transfer"] as const;
export type TransactionKind = (typeof TRANSACTION_KINDS)[number];

export type Transaction = {
  id: string;
  userId: string;
  kind: TransactionKind;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  linkedId: string | null;
  splitGroup: string | null;
  occurredAt: Date;
  note: string;
  tags: string[];
  createdAt: Date;
  deletedAt: Date | null;
};

export type TransactionView = Transaction & {
  accountName: string;
  toAccountName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
};

export const NOTE_MAX = 140;
export const TRASH_RETENTION_DAYS = 30;

export function extractTags(note: string) {
  const tags = new Set<string>();
  for (const m of note.matchAll(/#([\p{L}\p{N}_-]{1,24})/gu)) {
    const tag = m[1]?.toLowerCase();
    if (tag) tags.add(tag);
  }
  return [...tags].slice(0, 10);
}

export type TransactionDraft = {
  kind: TransactionKind;
  amount: number;
  accountId: string;
  toAccountId: string | null;
  category: Pick<Category, "id" | "kind" | "archived"> | null;
  fee: number;
};

const fail = (field: string, message: string) =>
  err(new DomainError("invalid_transaction", message, { [field]: [message] }));

export function validateDraft(d: TransactionDraft): Result<TransactionDraft> {
  if (!Number.isSafeInteger(d.amount) || d.amount <= 0) {
    return fail("amount", "Enter an amount greater than zero.");
  }

  if (d.kind === "transfer") {
    if (!d.toAccountId) return fail("toAccountId", "Choose where the money goes.");
    if (d.toAccountId === d.accountId) {
      return fail("toAccountId", "Pick two different wallets.");
    }
    if (d.fee < 0 || !Number.isSafeInteger(d.fee)) return fail("fee", "Fee can't be negative.");
    return ok({ ...d, category: null });
  }

  if (!d.category) return fail("categoryId", "Pick a category.");
  if (d.category.kind !== d.kind) return fail("categoryId", "That category doesn't match.");
  return ok({ ...d, toAccountId: null, fee: 0 });
}

export function signedAmount(t: Pick<Transaction, "kind" | "amount">) {
  if (t.kind === "income") return t.amount;
  if (t.kind === "expense") return -t.amount;
  return 0;
}
