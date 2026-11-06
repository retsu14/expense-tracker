import type { Ymd } from "@/shared/kernel/time";

import type { Account, AccountWithBalance } from "./account";
import type { Category } from "./category";
import type { UserSettings } from "./settings";
import type { Template } from "./template";
import type { Transaction, TransactionView } from "./transaction";
import type { Cursor, ResolvedFilter } from "./transaction-query";

export type NewTransaction = Omit<Transaction, "createdAt" | "deletedAt"> & {
  idempotencyKey: string | null;
};

export type TransactionPatch = Partial<
  Pick<
    Transaction,
    "kind" | "amount" | "accountId" | "toAccountId" | "categoryId" | "occurredAt" | "note" | "tags"
  >
>;

export type ChangeSet = {
  insert?: NewTransaction[];
  update?: { id: string; patch: TransactionPatch }[];
  hardDelete?: string[];
};

export type Summary = { count: number; expense: number; income: number };
export type DayTotal = { day: Ymd; expense: number; income: number };

export type LedgerRepository = {
  getSettings(userId: string): Promise<UserSettings | null>;
  saveSettings(settings: UserSettings): Promise<void>;

  listAccounts(userId: string, includeArchived?: boolean): Promise<AccountWithBalance[]>;
  getAccount(userId: string, id: string): Promise<Account | null>;
  countAccounts(userId: string): Promise<number>;
  createAccounts(accounts: Omit<Account, "createdAt">[]): Promise<void>;
  updateAccount(
    userId: string,
    id: string,
    patch: Partial<Pick<Account, "name" | "type" | "openingBalance" | "color" | "archived">>,
  ): Promise<boolean>;

  listCategories(userId: string, includeArchived?: boolean): Promise<Category[]>;
  getCategory(userId: string, id: string): Promise<Category | null>;
  countCategories(userId: string): Promise<number>;
  createCategories(categories: Category[]): Promise<void>;
  updateCategory(
    userId: string,
    id: string,
    patch: Partial<Pick<Category, "name" | "icon" | "color" | "archived">>,
  ): Promise<boolean>;
  categoryUsage(userId: string, since: Date): Promise<Map<string, number>>;

  findByIdempotencyKey(userId: string, key: string): Promise<Transaction | null>;
  getTransaction(userId: string, id: string, includeDeleted?: boolean): Promise<Transaction | null>;
  getLinked(userId: string, id: string): Promise<Transaction | null>;
  applyChanges(userId: string, changes: ChangeSet): Promise<void>;
  softDelete(userId: string, ids: string[], at: Date): Promise<number>;
  restore(userId: string, ids: string[]): Promise<number>;
  purgeDeleted(userId: string, before: Date): Promise<number>;
  purgeIds(userId: string, ids: string[]): Promise<number>;

  list(
    userId: string,
    filter: ResolvedFilter,
    cursor: Cursor | null,
    limit: number,
  ): Promise<TransactionView[]>;
  listDeleted(userId: string, limit: number): Promise<TransactionView[]>;
  summary(userId: string, filter: ResolvedFilter): Promise<Summary>;
  dayTotals(userId: string, filter: ResolvedFilter, days: Ymd[], tz: string): Promise<DayTotal[]>;
  expenseByCategory(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ categoryId: string | null; total: number }[]>;
  lastUsedAccountId(userId: string): Promise<string | null>;
  suggestCategoryId(
    userId: string,
    kind: "expense" | "income",
    note: string,
  ): Promise<string | null>;

  listTemplates(userId: string): Promise<Template[]>;
  countTemplates(userId: string): Promise<number>;
  createTemplate(template: Template): Promise<void>;
  deleteTemplate(userId: string, id: string): Promise<boolean>;
};
