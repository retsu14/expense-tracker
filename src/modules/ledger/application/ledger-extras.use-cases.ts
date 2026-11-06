import { z } from "zod";

import { evaluateAmount } from "@/modules/ledger/domain/amount-expression";
import { type Category, DEFAULT_CATEGORIES } from "@/modules/ledger/domain/category";
import type { NewTransaction } from "@/modules/ledger/domain/ports";
import { extractTags, NOTE_MAX } from "@/modules/ledger/domain/transaction";
import { filterToParams, parseFilterParams } from "@/modules/ledger/domain/transaction-query";
import { DomainError, err, ok, type Result } from "@/shared/kernel/result";
import { toYmd, zonedDateTime } from "@/shared/kernel/time";
import { parse } from "@/shared/validation";

import type { LedgerDeps } from "./deps";
import { createTransaction, ensureDefaultCategories, getSettings } from "./ledger.use-cases";

const MAX_SPLIT_PARTS = 8;
const MAX_SAVED_FILTERS = 12;

const fieldError = (field: string, message: string) =>
  err(new DomainError("validation_failed", message, { [field]: [message] }));

export async function ensureSystemCategory(
  deps: LedgerDeps,
  userId: string,
  system: NonNullable<Category["system"]>,
): Promise<Category> {
  await ensureDefaultCategories(deps, userId);
  const all = await deps.ledger.listCategories(userId, true);
  const found = all.find((c) => c.system === system);
  if (found) return found;
  const seed = DEFAULT_CATEGORIES.find((c) => c.system === system);
  if (!seed) throw new Error(`Unknown system category ${system}`);
  const category: Category = {
    id: deps.newId(),
    userId,
    name: seed.name,
    kind: seed.kind,
    icon: seed.icon,
    color: seed.color,
    archived: false,
    sort: 200 + all.length,
    system,
  };
  await deps.ledger.createCategories([category]);
  return category;
}

const splitInput = z.object({
  accountId: z.uuid("Pick a wallet."),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(NOTE_MAX).default(""),
  idempotencyKey: z.string().min(8).max(64),
  parts: z
    .array(
      z.object({
        categoryId: z.uuid("Pick a category."),
        amount: z.string().trim().min(1).max(60),
      }),
    )
    .min(2, "Add at least two parts.")
    .max(MAX_SPLIT_PARTS),
});

export async function createSplitTransaction(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<{ ids: string[]; total: number; duplicate: boolean }>> {
  const parsed = parse(splitInput, input);
  if (!parsed.ok) return parsed;
  const v = parsed.value;

  const existing = await deps.ledger.findByIdempotencyKey(userId, `${v.idempotencyKey}:0`);
  if (existing) return ok({ ids: [existing.id], total: 0, duplicate: true });

  const account = await deps.ledger.getAccount(userId, v.accountId);
  if (!account) return fieldError("accountId", "Pick a wallet.");

  const amounts: number[] = [];
  for (const [i, part] of v.parts.entries()) {
    const amount = evaluateAmount(part.amount);
    if (amount === null) return fieldError(`parts.${i}.amount`, "Enter a valid amount.");
    const category = await deps.ledger.getCategory(userId, part.categoryId);
    if (category?.kind !== "expense")
      return fieldError(`parts.${i}.categoryId`, "Pick an expense category.");
    amounts.push(amount);
  }

  const { timezone } = await getSettings(deps, userId);
  const now = deps.clock.now();
  const occurredAt =
    v.date === toYmd(now, timezone) ? now : zonedDateTime(v.date, "12:00", timezone);
  const group = deps.newId();
  const rows: NewTransaction[] = v.parts.map((part, i) => ({
    id: deps.newId(),
    userId,
    kind: "expense",
    amount: amounts[i] ?? 0,
    accountId: account.id,
    toAccountId: null,
    categoryId: part.categoryId,
    linkedId: null,
    splitGroup: group,
    occurredAt,
    note: v.note,
    tags: extractTags(v.note),
    idempotencyKey: `${v.idempotencyKey}:${i}`,
  }));

  await deps.ledger.applyChanges(userId, { insert: rows });
  return ok({
    ids: rows.map((r) => r.id),
    total: amounts.reduce((s, a) => s + a, 0),
    duplicate: false,
  });
}

const bulkInput = z.object({
  ids: z.array(z.uuid()).min(1).max(200),
  categoryId: z.uuid().optional(),
  accountId: z.uuid().optional(),
});

export async function bulkUpdateTransactions(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<{ updated: number; skipped: number }>> {
  const parsed = parse(bulkInput, input);
  if (!parsed.ok) return parsed;
  const { ids, categoryId, accountId } = parsed.value;
  if (!categoryId && !accountId) return err(new DomainError("nothing_to_do", "Choose a change."));

  if (categoryId) {
    const category = await deps.ledger.getCategory(userId, categoryId);
    if (!category || category.archived) return fieldError("categoryId", "Pick a category.");
    const updated = await deps.ledger.bulkUpdate(userId, ids, { categoryId }, category.kind);
    return ok({ updated, skipped: ids.length - updated });
  }

  const account = accountId ? await deps.ledger.getAccount(userId, accountId) : null;
  if (!account || account.archived) return fieldError("accountId", "Pick a wallet.");
  const updated = await deps.ledger.bulkUpdate(userId, ids, { accountId: account.id }, null);
  return ok({ updated, skipped: ids.length - updated });
}

const savedFilterInput = z.object({
  name: z.string().trim().min(1, "Name this view.").max(30),
  params: z.record(z.string(), z.string()),
});

export async function saveFilter(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const parsed = parse(savedFilterInput, input);
  if (!parsed.ok) return parsed;
  if ((await deps.ledger.countSavedFilters(userId)) >= MAX_SAVED_FILTERS) {
    return err(new DomainError("limit_reached", `You can keep up to ${MAX_SAVED_FILTERS} views.`));
  }
  const params = Object.fromEntries(filterToParams(parseFilterParams(parsed.value.params)));
  if (Object.keys(params).length === 0)
    return err(new DomainError("empty", "Apply a filter first."));
  const id = deps.newId();
  await deps.ledger.createSavedFilter({ id, userId, name: parsed.value.name, params });
  return ok(id);
}

export async function deleteSavedFilter(deps: LedgerDeps, userId: string, id: string) {
  return (await deps.ledger.deleteSavedFilter(userId, id))
    ? ok(undefined)
    : err(new DomainError("not_found", "View not found."));
}

const importInput = z.object({
  accountId: z.uuid("Pick a wallet."),
  rows: z
    .array(
      z.object({
        line: z.number().int(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        kind: z.enum(["expense", "income"]),
        amount: z.number().int().positive().max(10_000_000_000),
        note: z.string().max(NOTE_MAX),
        category: z.string().max(60),
        key: z.string().regex(/^imp:[0-9a-f]{16}$/),
      }),
    )
    .min(1)
    .max(200),
});

export async function importTransactions(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<
  Result<{ imported: number; duplicates: number; failed: { line: number; message: string }[] }>
> {
  const parsed = parse(importInput, input);
  if (!parsed.ok) return parsed;
  const account = await deps.ledger.getAccount(userId, parsed.value.accountId);
  if (!account) return fieldError("accountId", "Pick a wallet.");

  await ensureDefaultCategories(deps, userId);
  const categories = (await deps.ledger.listCategories(userId)).filter((c) => !c.system);
  const byName = new Map(categories.map((c) => [`${c.kind}:${c.name.toLowerCase()}`, c.id]));
  const fallback = {
    expense: byName.get("expense:other") ?? categories.find((c) => c.kind === "expense")?.id,
    income: byName.get("income:other income") ?? categories.find((c) => c.kind === "income")?.id,
  };

  let imported = 0;
  let duplicates = 0;
  const failed: { line: number; message: string }[] = [];
  for (const row of parsed.value.rows) {
    const categoryId =
      byName.get(`${row.kind}:${row.category.trim().toLowerCase()}`) ?? fallback[row.kind];
    const res = await createTransaction(deps, userId, {
      kind: row.kind,
      amount: (row.amount / 100).toFixed(2),
      accountId: account.id,
      categoryId,
      date: row.date,
      time: "12:00",
      note: row.note,
      idempotencyKey: row.key,
    });
    if (!res.ok) failed.push({ line: row.line, message: res.error.message });
    else if (res.value.duplicate) duplicates++;
    else imported++;
  }
  return ok({ imported, duplicates, failed });
}
