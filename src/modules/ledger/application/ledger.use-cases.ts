import { MAX_ACCOUNTS, validateAccountName } from "@/modules/ledger/domain/account";
import {
  type Category,
  DEFAULT_CATEGORIES,
  validateCategoryName,
} from "@/modules/ledger/domain/category";
import { evaluateAmount } from "@/modules/ledger/domain/amount-expression";
import type { NewTransaction } from "@/modules/ledger/domain/ports";
import { DEFAULT_PAYDAY, type UserSettings } from "@/modules/ledger/domain/settings";
import { MAX_TEMPLATES } from "@/modules/ledger/domain/template";
import {
  extractTags,
  TRASH_RETENTION_DAYS,
  validateDraft,
} from "@/modules/ledger/domain/transaction";
import {
  decodeCursor,
  encodeCursor,
  resolveFilter,
  type TransactionFilter,
} from "@/modules/ledger/domain/transaction-query";
import { DEFAULT_TIMEZONE } from "@/shared/kernel/clock";
import { DomainError, err, ok, type Result } from "@/shared/kernel/result";
import { toYmd, zonedDateTime } from "@/shared/kernel/time";
import { parse } from "@/shared/validation";

import type { LedgerDeps } from "./deps";
import {
  accountInput,
  categoryInput,
  idList,
  onboardingInput,
  templateInput,
  transactionInput,
} from "./schemas";

const DAY_MS = 86_400_000;
const PAGE_MAX = 100;

const fieldError = (field: string, message: string, code = "validation_failed") =>
  err(new DomainError(code, message, { [field]: [message] }));

const notFound = (what: string) => err(new DomainError("not_found", `${what} not found.`));

function money(input: string, field: string, allowZero = false): Result<number> {
  const text = input.trim();
  if (allowZero && (text === "" || /^0+(\.0+)?$/.test(text))) return ok(0);
  const negative = allowZero && text.startsWith("-");
  const value = evaluateAmount(negative ? text.slice(1) : text);
  if (value === null) return fieldError(field, "Enter a valid amount, like 150 or 120+30.");
  return ok(negative ? -value : value);
}

export async function getSettings(deps: LedgerDeps, userId: string): Promise<UserSettings> {
  return (
    (await deps.ledger.getSettings(userId)) ?? {
      userId,
      timezone: DEFAULT_TIMEZONE,
      payday: { type: "none" },
      monthlyIncome: null,
      onboardedAt: null,
    }
  );
}

export async function ensureDefaultCategories(deps: LedgerDeps, userId: string) {
  if ((await deps.ledger.countCategories(userId)) > 0) return;
  await deps.ledger.createCategories(
    DEFAULT_CATEGORIES.map((c, i) => ({
      id: deps.newId(),
      userId,
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      color: c.color,
      archived: false,
      sort: i,
      system: c.system ?? null,
    })),
  );
}

export async function completeOnboarding(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(onboardingInput, input);
  if (!parsed.ok) return parsed;

  const wallets = [];
  for (const [i, w] of parsed.value.wallets.entries()) {
    const name = validateAccountName(w.name);
    if (!name.ok) return fieldError(`wallets.${i}.name`, name.error.message);
    const opening = money(w.openingBalance, `wallets.${i}.openingBalance`, true);
    if (!opening.ok) return opening;
    wallets.push({ ...w, name: name.value, openingBalance: opening.value });
  }

  let monthlyIncome: number | null = null;
  if (parsed.value.monthlyIncome) {
    const income = money(parsed.value.monthlyIncome, "monthlyIncome");
    if (!income.ok) return income;
    monthlyIncome = income.value;
  }

  if ((await deps.ledger.countAccounts(userId)) === 0) {
    await deps.ledger.createAccounts(
      wallets.map((w, i) => ({
        id: deps.newId(),
        userId,
        name: w.name,
        type: w.type,
        openingBalance: w.openingBalance,
        color: w.color,
        archived: false,
        sort: i,
      })),
    );
  }
  await ensureDefaultCategories(deps, userId);

  const settings = await getSettings(deps, userId);
  await deps.ledger.saveSettings({
    ...settings,
    payday: parsed.value.payday,
    monthlyIncome,
    onboardedAt: deps.clock.now(),
  });
  return ok(undefined);
}

export async function skipOnboarding(deps: LedgerDeps, userId: string) {
  return completeOnboarding(deps, userId, {
    wallets: [{ name: "Cash", type: "cash", openingBalance: "0", color: "#8FB996" }],
    payday: DEFAULT_PAYDAY,
  });
}

export async function createAccount(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const parsed = parse(accountInput, input);
  if (!parsed.ok) return parsed;
  const name = validateAccountName(parsed.value.name);
  if (!name.ok) return name;
  const opening = money(parsed.value.openingBalance, "openingBalance", true);
  if (!opening.ok) return opening;

  const total = await deps.ledger.countAccounts(userId);
  if (total >= MAX_ACCOUNTS) {
    return err(new DomainError("limit_reached", `You can have up to ${MAX_ACCOUNTS} wallets.`));
  }

  const id = deps.newId();
  await deps.ledger.createAccounts([
    {
      id,
      userId,
      name: name.value,
      type: parsed.value.type,
      openingBalance: opening.value,
      color: parsed.value.color,
      archived: false,
      sort: total,
    },
  ]);
  return ok(id);
}

export async function updateAccount(
  deps: LedgerDeps,
  userId: string,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(accountInput, input);
  if (!parsed.ok) return parsed;
  const name = validateAccountName(parsed.value.name);
  if (!name.ok) return name;
  const opening = money(parsed.value.openingBalance, "openingBalance", true);
  if (!opening.ok) return opening;

  const updated = await deps.ledger.updateAccount(userId, id, {
    name: name.value,
    type: parsed.value.type,
    openingBalance: opening.value,
    color: parsed.value.color,
  });
  return updated ? ok(undefined) : notFound("Wallet");
}

export async function setAccountArchived(
  deps: LedgerDeps,
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  if (archived) {
    const active = await deps.ledger.listAccounts(userId);
    if (active.length <= 1 && active[0]?.id === id) {
      return err(new DomainError("last_account", "Keep at least one active wallet."));
    }
  }
  const updated = await deps.ledger.updateAccount(userId, id, { archived });
  return updated ? ok(undefined) : notFound("Wallet");
}

export async function createCategory(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const parsed = parse(categoryInput, input);
  if (!parsed.ok) return parsed;
  const name = validateCategoryName(parsed.value.name);
  if (!name.ok) return name;

  const id = deps.newId();
  await deps.ledger.createCategories([
    {
      id,
      userId,
      name: name.value,
      kind: parsed.value.kind,
      icon: parsed.value.icon,
      color: parsed.value.color,
      archived: false,
      sort: 100 + (await deps.ledger.countCategories(userId)),
      system: null,
    },
  ]);
  return ok(id);
}

export async function updateCategory(
  deps: LedgerDeps,
  userId: string,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(categoryInput.omit({ kind: true }), input);
  if (!parsed.ok) return parsed;
  const name = validateCategoryName(parsed.value.name);
  if (!name.ok) return name;
  const updated = await deps.ledger.updateCategory(userId, id, {
    name: name.value,
    icon: parsed.value.icon,
    color: parsed.value.color,
  });
  return updated ? ok(undefined) : notFound("Category");
}

export async function setCategoryArchived(
  deps: LedgerDeps,
  userId: string,
  id: string,
  archived: boolean,
): Promise<Result<void>> {
  const category = await deps.ledger.getCategory(userId, id);
  if (!category) return notFound("Category");
  if (archived && category.system) {
    return err(new DomainError("system_category", "This category is used for transfer fees."));
  }
  await deps.ledger.updateCategory(userId, id, { archived });
  return ok(undefined);
}

export async function quickAddContext(deps: LedgerDeps, userId: string) {
  const now = deps.clock.now();
  const [settings, accounts, categories, templates, usage, lastAccountId] = await Promise.all([
    getSettings(deps, userId),
    deps.ledger.listAccounts(userId),
    deps.ledger.listCategories(userId),
    deps.ledger.listTemplates(userId),
    deps.ledger.categoryUsage(userId, new Date(now.getTime() - 90 * DAY_MS)),
    deps.ledger.lastUsedAccountId(userId),
  ]);

  const byUsage = (a: Category, b: Category) =>
    (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0) || a.sort - b.sort;

  return {
    timezone: settings.timezone,
    today: toYmd(now, settings.timezone),
    accounts,
    categories: [...categories].sort(byUsage),
    templates,
    lastAccountId:
      lastAccountId && accounts.some((a) => a.id === lastAccountId)
        ? lastAccountId
        : (accounts[0]?.id ?? null),
  };
}

type BuiltRows = { main: NewTransaction; fee: NewTransaction | null };

async function buildRows(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
  id: string,
): Promise<Result<BuiltRows>> {
  const parsed = parse(transactionInput, input);
  if (!parsed.ok) return parsed;
  const v = parsed.value;

  const amount = money(v.amount, "amount");
  if (!amount.ok) return amount;
  const fee = v.kind === "transfer" && v.fee ? money(v.fee, "fee", true) : ok(0);
  if (!fee.ok) return fee;

  const [account, toAccount, category] = await Promise.all([
    deps.ledger.getAccount(userId, v.accountId),
    v.toAccountId ? deps.ledger.getAccount(userId, v.toAccountId) : null,
    v.categoryId && v.kind !== "transfer" ? deps.ledger.getCategory(userId, v.categoryId) : null,
  ]);
  if (!account) return fieldError("accountId", "Pick a wallet.");
  if (v.toAccountId && !toAccount) return fieldError("toAccountId", "Pick a wallet.");

  const draft = validateDraft({
    kind: v.kind,
    amount: amount.value,
    accountId: account.id,
    toAccountId: toAccount?.id ?? null,
    category,
    fee: fee.value,
  });
  if (!draft.ok) return draft;

  const { timezone } = await getSettings(deps, userId);
  const now = deps.clock.now();
  const occurredAt =
    v.time !== undefined
      ? zonedDateTime(v.date, v.time, timezone)
      : v.date === toYmd(now, timezone)
        ? now
        : zonedDateTime(v.date, "12:00", timezone);

  const main: NewTransaction = {
    id,
    userId,
    kind: v.kind,
    amount: draft.value.amount,
    accountId: draft.value.accountId,
    toAccountId: draft.value.toAccountId,
    categoryId: draft.value.category?.id ?? null,
    linkedId: null,
    occurredAt,
    note: v.note,
    tags: extractTags(v.note),
    idempotencyKey: v.idempotencyKey ?? null,
  };

  let feeRow: NewTransaction | null = null;
  if (v.kind === "transfer" && draft.value.fee > 0) {
    await ensureDefaultCategories(deps, userId);
    const feeCategory = (await deps.ledger.listCategories(userId, true)).find(
      (c) => c.system === "fees",
    );
    if (!feeCategory) return err(new DomainError("missing_fee_category", "Fees category missing."));
    feeRow = {
      id: deps.newId(),
      userId,
      kind: "expense",
      amount: draft.value.fee,
      accountId: draft.value.accountId,
      toAccountId: null,
      categoryId: feeCategory.id,
      linkedId: id,
      occurredAt,
      note: toAccount ? `Transfer fee to ${toAccount.name}` : "Transfer fee",
      tags: [],
      idempotencyKey: null,
    };
  }

  return ok({ main, fee: feeRow });
}

export async function createTransaction(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<{ id: string; duplicate: boolean }>> {
  const key =
    typeof input === "object" && input !== null && "idempotencyKey" in input
      ? (input as { idempotencyKey?: unknown }).idempotencyKey
      : undefined;
  if (typeof key === "string" && key) {
    const existing = await deps.ledger.findByIdempotencyKey(userId, key);
    if (existing) return ok({ id: existing.id, duplicate: true });
  }

  const rows = await buildRows(deps, userId, input, deps.newId());
  if (!rows.ok) return rows;
  await deps.ledger.applyChanges(userId, {
    insert: rows.value.fee ? [rows.value.main, rows.value.fee] : [rows.value.main],
  });
  return ok({ id: rows.value.main.id, duplicate: false });
}

export async function getTransactionForEdit(deps: LedgerDeps, userId: string, id: string) {
  const tx = await deps.ledger.getTransaction(userId, id);
  if (!tx || tx.linkedId) return null;
  const fee = tx.kind === "transfer" ? await deps.ledger.getLinked(userId, id) : null;
  return { ...tx, fee: fee && !fee.deletedAt ? fee.amount : 0 };
}

export async function updateTransaction(
  deps: LedgerDeps,
  userId: string,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  const existing = await deps.ledger.getTransaction(userId, id);
  if (!existing || existing.linkedId) return notFound("Transaction");

  const rows = await buildRows(
    deps,
    userId,
    { ...(input as object), idempotencyKey: undefined },
    id,
  );
  if (!rows.ok) return rows;
  const { main, fee } = rows.value;
  const oldFee = await deps.ledger.getLinked(userId, id);

  const { id: _id, userId: _u, idempotencyKey: _k, linkedId: _l, ...patch } = main;
  const update = [{ id, patch }];
  const insert: NewTransaction[] = [];
  const hardDelete: string[] = [];

  if (fee && oldFee) {
    update.push({
      id: oldFee.id,
      patch: {
        kind: "expense",
        amount: fee.amount,
        accountId: fee.accountId,
        toAccountId: null,
        categoryId: fee.categoryId,
        occurredAt: fee.occurredAt,
        note: fee.note,
        tags: [],
      },
    });
  } else if (fee) insert.push(fee);
  else if (oldFee) hardDelete.push(oldFee.id);

  await deps.ledger.applyChanges(userId, { update, insert, hardDelete });
  return ok(undefined);
}

export async function deleteTransactions(
  deps: LedgerDeps,
  userId: string,
  ids: unknown,
): Promise<Result<number>> {
  const parsed = parse(idList, ids);
  if (!parsed.ok) return parsed;
  return ok(await deps.ledger.softDelete(userId, parsed.value, deps.clock.now()));
}

export async function restoreTransactions(
  deps: LedgerDeps,
  userId: string,
  ids: unknown,
): Promise<Result<number>> {
  const parsed = parse(idList, ids);
  if (!parsed.ok) return parsed;
  return ok(await deps.ledger.restore(userId, parsed.value));
}

export async function deleteForever(
  deps: LedgerDeps,
  userId: string,
  ids: unknown,
): Promise<Result<number>> {
  const parsed = parse(idList, ids);
  if (!parsed.ok) return parsed;
  return ok(await deps.ledger.purgeIds(userId, parsed.value));
}

export async function listTrash(deps: LedgerDeps, userId: string) {
  const cutoff = new Date(deps.clock.now().getTime() - TRASH_RETENTION_DAYS * DAY_MS);
  await deps.ledger.purgeDeleted(userId, cutoff);
  return deps.ledger.listDeleted(userId, 200);
}

export async function listTransactions(
  deps: LedgerDeps,
  userId: string,
  filter: TransactionFilter,
  cursor: string | null,
  limit = 25,
) {
  const { timezone } = await getSettings(deps, userId);
  const resolved = resolveFilter(filter, deps.clock.now(), timezone);
  const size = Math.min(Math.max(limit, 1), PAGE_MAX);
  const rows = await deps.ledger.list(userId, resolved, decodeCursor(cursor), size + 1);
  const items = rows.slice(0, size);
  const last = items.at(-1);
  const days = [...new Set(items.map((t) => toYmd(t.occurredAt, timezone)))];
  const dayTotals = await deps.ledger.dayTotals(userId, resolved, days, timezone);

  return {
    items,
    timezone,
    dayTotals,
    nextCursor:
      rows.length > size && last
        ? encodeCursor({ occurredAt: last.occurredAt, id: last.id })
        : null,
  };
}

export async function transactionSummary(
  deps: LedgerDeps,
  userId: string,
  filter: TransactionFilter,
) {
  const { timezone } = await getSettings(deps, userId);
  return deps.ledger.summary(userId, resolveFilter(filter, deps.clock.now(), timezone));
}

export async function suggestCategory(
  deps: LedgerDeps,
  userId: string,
  kind: "expense" | "income",
  note: string,
) {
  return deps.ledger.suggestCategoryId(userId, kind, note.slice(0, 80));
}

export async function createTemplate(
  deps: LedgerDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const parsed = parse(templateInput, input);
  if (!parsed.ok) return parsed;
  const amount = money(parsed.value.amount, "amount");
  if (!amount.ok) return amount;
  const category = await deps.ledger.getCategory(userId, parsed.value.categoryId);
  if (category?.kind !== parsed.value.kind) return fieldError("categoryId", "Pick a category.");
  const count = await deps.ledger.countTemplates(userId);
  if (count >= MAX_TEMPLATES) {
    return err(new DomainError("limit_reached", `You can keep up to ${MAX_TEMPLATES} favorites.`));
  }

  const id = deps.newId();
  await deps.ledger.createTemplate({
    id,
    userId,
    name: parsed.value.name,
    kind: parsed.value.kind,
    amount: amount.value,
    categoryId: category.id,
    accountId: parsed.value.accountId,
    note: parsed.value.note,
    sort: count,
  });
  return ok(id);
}

export async function deleteTemplate(
  deps: LedgerDeps,
  userId: string,
  id: string,
): Promise<Result<void>> {
  return (await deps.ledger.deleteTemplate(userId, id)) ? ok(undefined) : notFound("Favorite");
}
