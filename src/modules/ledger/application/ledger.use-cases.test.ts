import { describe, expect, it } from "vitest";

import type { Account } from "@/modules/ledger/domain/account";
import type { Category } from "@/modules/ledger/domain/category";
import type { LedgerRepository, NewTransaction } from "@/modules/ledger/domain/ports";
import type { UserSettings } from "@/modules/ledger/domain/settings";
import type { Transaction } from "@/modules/ledger/domain/transaction";

import type { LedgerDeps } from "./deps";
import {
  completeOnboarding,
  createTransaction,
  deleteTransactions,
  getTransactionForEdit,
  restoreTransactions,
  setCategoryArchived,
  updateTransaction,
} from "./ledger.use-cases";

const USER = "00000000-0000-7000-8000-000000000001";

function fakeDeps() {
  let seq = 0;
  const now = new Date("2026-03-15T04:00:00Z");
  const accounts: Account[] = [];
  const categories: Category[] = [];
  const txs: (Transaction & { idempotencyKey: string | null })[] = [];
  let settings: UserSettings | null = null;

  const repo: Partial<LedgerRepository> = {
    getSettings: () => Promise.resolve(settings),
    saveSettings: (s) => {
      settings = s;
      return Promise.resolve();
    },
    countAccounts: () => Promise.resolve(accounts.length),
    createAccounts: (list) => {
      accounts.push(...list.map((a) => ({ ...a, createdAt: now })));
      return Promise.resolve();
    },
    getAccount: (_u, id) => Promise.resolve(accounts.find((a) => a.id === id) ?? null),
    listAccounts: () =>
      Promise.resolve(accounts.filter((a) => !a.archived).map((a) => ({ ...a, balance: 0 }))),
    countCategories: () => Promise.resolve(categories.length),
    createCategories: (list) => {
      categories.push(...list);
      return Promise.resolve();
    },
    listCategories: () => Promise.resolve(categories),
    getCategory: (_u, id) => Promise.resolve(categories.find((c) => c.id === id) ?? null),
    updateCategory: () => Promise.resolve(true),
    findByIdempotencyKey: (_u, key) =>
      Promise.resolve(txs.find((t) => t.idempotencyKey === key) ?? null),
    getTransaction: (_u, id) =>
      Promise.resolve(txs.find((t) => t.id === id && !t.deletedAt) ?? null),
    getLinked: (_u, id) => Promise.resolve(txs.find((t) => t.linkedId === id) ?? null),
    applyChanges: (_u, changes) => {
      const insert = (t: NewTransaction) => {
        txs.push({ ...t, createdAt: now, deletedAt: null });
      };
      changes.insert?.forEach(insert);
      for (const { id, patch } of changes.update ?? []) {
        const t = txs.find((x) => x.id === id);
        if (t) Object.assign(t, patch);
      }
      for (const id of changes.hardDelete ?? [])
        txs.splice(
          txs.findIndex((t) => t.id === id),
          1,
        );
      return Promise.resolve();
    },
    softDelete: (_u, ids, at) => {
      const hit = txs.filter(
        (t) => !t.deletedAt && (ids.includes(t.id) || ids.includes(t.linkedId ?? "")),
      );
      hit.forEach((t) => (t.deletedAt = at));
      return Promise.resolve(hit.length);
    },
    restore: (_u, ids) => {
      const hit = txs.filter(
        (t) => t.deletedAt && (ids.includes(t.id) || ids.includes(t.linkedId ?? "")),
      );
      hit.forEach((t) => (t.deletedAt = null));
      return Promise.resolve(hit.length);
    },
  };

  const deps: LedgerDeps = {
    ledger: repo as LedgerRepository,
    clock: { now: () => now },
    newId: () => `00000000-0000-7000-8000-${String(++seq).padStart(12, "0")}`,
  };
  return { deps, accounts, categories, txs, getSettings: () => settings };
}

async function onboarded() {
  const env = fakeDeps();
  const res = await completeOnboarding(env.deps, USER, {
    wallets: [
      { name: "Cash", type: "cash", openingBalance: "500", color: "#8FB996" },
      { name: "GCash", type: "ewallet", openingBalance: "1,000.50", color: "#7FB3D5" },
    ],
    payday: { type: "semi_monthly", days: [15, 30] },
    monthlyIncome: "25000",
  });
  if (!res.ok) throw res.error;
  const cash = env.accounts[0]?.id ?? "";
  const gcash = env.accounts[1]?.id ?? "";
  const food = env.categories.find((c) => c.name === "Food")?.id ?? "";
  return { ...env, cash, gcash, food };
}

describe("onboarding", () => {
  it("creates wallets, default categories and settings", async () => {
    const { accounts, categories, getSettings } = await onboarded();
    expect(accounts.map((a) => [a.name, a.openingBalance])).toEqual([
      ["Cash", 50000],
      ["GCash", 100050],
    ]);
    expect(categories.some((c) => c.system === "fees")).toBe(true);
    expect(getSettings()?.monthlyIncome).toBe(2500000);
    expect(getSettings()?.onboardedAt).toBeInstanceOf(Date);
  });
});

describe("transactions", () => {
  it("evaluates amount math and extracts tags", async () => {
    const { deps, txs, cash, food } = await onboarded();
    const res = await createTransaction(deps, USER, {
      kind: "expense",
      amount: "120+30",
      accountId: cash,
      categoryId: food,
      date: "2026-03-15",
      note: "Lunch #work",
    });
    expect(res.ok).toBe(true);
    expect(txs[0]).toMatchObject({ amount: 15000, tags: ["work"], kind: "expense" });
  });

  it("is idempotent with the same key", async () => {
    const { deps, txs, cash, food } = await onboarded();
    const input = {
      kind: "expense",
      amount: "50",
      accountId: cash,
      categoryId: food,
      date: "2026-03-15",
      idempotencyKey: "key-12345678",
    };
    await createTransaction(deps, USER, input);
    const second = await createTransaction(deps, USER, input);
    expect(second.ok && second.value.duplicate).toBe(true);
    expect(txs).toHaveLength(1);
  });

  it("creates a linked fee for transfers and keeps it in sync on edit", async () => {
    const { deps, txs, cash, gcash } = await onboarded();
    const res = await createTransaction(deps, USER, {
      kind: "transfer",
      amount: "1000",
      accountId: gcash,
      toAccountId: cash,
      fee: "15",
      date: "2026-03-15",
    });
    if (!res.ok) throw res.error;
    expect(txs).toHaveLength(2);
    expect(txs[1]).toMatchObject({ kind: "expense", amount: 1500, linkedId: res.value.id });

    expect((await getTransactionForEdit(deps, USER, res.value.id))?.fee).toBe(1500);

    await updateTransaction(deps, USER, res.value.id, {
      kind: "transfer",
      amount: "2000",
      accountId: gcash,
      toAccountId: cash,
      fee: "0",
      date: "2026-03-15",
    });
    expect(txs).toHaveLength(1);
    expect(txs[0]?.amount).toBe(200000);
  });

  it("rejects mismatched categories and same-wallet transfers", async () => {
    const { deps, cash, food, categories } = await onboarded();
    const salary = categories.find((c) => c.name === "Salary")?.id;
    const income = await createTransaction(deps, USER, {
      kind: "income",
      amount: "100",
      accountId: cash,
      categoryId: food,
      date: "2026-03-15",
    });
    expect(!income.ok && income.error.fieldErrors?.categoryId).toBeTruthy();

    const same = await createTransaction(deps, USER, {
      kind: "transfer",
      amount: "100",
      accountId: cash,
      toAccountId: cash,
      categoryId: salary,
      date: "2026-03-15",
    });
    expect(!same.ok && same.error.fieldErrors?.toAccountId).toBeTruthy();
  });

  it("soft deletes and restores a transfer with its fee", async () => {
    const { deps, txs, cash, gcash } = await onboarded();
    const res = await createTransaction(deps, USER, {
      kind: "transfer",
      amount: "500",
      accountId: cash,
      toAccountId: gcash,
      fee: "10",
      date: "2026-03-15",
    });
    if (!res.ok) throw res.error;
    expect(await deleteTransactions(deps, USER, [res.value.id])).toEqual({ ok: true, value: 2 });
    expect(txs.every((t) => t.deletedAt)).toBe(true);
    expect(await restoreTransactions(deps, USER, [res.value.id])).toEqual({ ok: true, value: 2 });
  });

  it("protects the fees category from archiving", async () => {
    const { deps, categories } = await onboarded();
    const fees = categories.find((c) => c.system === "fees")?.id ?? "";
    expect((await setCategoryArchived(deps, USER, fees, true)).ok).toBe(false);
  });
});
