import { describe, expect, it } from "vitest";

import { parseEntry, type EntryContext } from "./entry-parser";
import { normalizeOllamaUrl } from "./models";
import { mergeDrafts, parseAiEntry, renderMarkdownLite, splitBold } from "./prompts";
import { ruleTips, type AssistantSnapshot } from "./snapshot";

const ctx: EntryContext = {
  today: "2026-11-06",
  categories: [
    { id: "food", name: "Food", kind: "expense" },
    { id: "groc", name: "Groceries", kind: "expense" },
    { id: "trans", name: "Transport", kind: "expense" },
    { id: "fees", name: "Fees", kind: "expense", system: "fees" },
    { id: "sal", name: "Salary", kind: "income" },
  ],
  accounts: [
    { id: "cash", name: "Cash" },
    { id: "gcash", name: "GCash" },
    { id: "bpi", name: "BPI Savings" },
  ],
};

describe("parseEntry", () => {
  it("reads a simple expense", () => {
    expect(parseEntry("lunch 150 gcash", ctx)).toEqual({
      kind: "expense",
      amount: "150",
      categoryId: "food",
      accountId: "gcash",
      toAccountId: null,
      date: null,
      note: "Lunch",
    });
  });

  it("handles peso sign, commas, decimals and yesterday", () => {
    const d = parseEntry("Jollibee ₱1,250.50 yesterday cash", ctx);
    expect(d).toMatchObject({
      amount: "1250.50",
      date: "2026-11-05",
      categoryId: "food",
      accountId: "cash",
    });
    expect(d.note).toBe("Jollibee");
  });

  it("detects income, k shorthand and account first-word alias", () => {
    expect(parseEntry("sahod 15k bpi", ctx)).toMatchObject({
      kind: "income",
      amount: "15000",
      categoryId: "sal",
      accountId: "bpi",
    });
  });

  it("detects transfers with direction", () => {
    expect(parseEntry("transfer 500 from gcash to cash", ctx)).toMatchObject({
      kind: "transfer",
      amount: "500",
      accountId: "gcash",
      toAccountId: "cash",
      categoryId: null,
    });
  });

  it("parses relative and calendar dates", () => {
    expect(parseEntry("grab 250 2 days ago", ctx)).toMatchObject({
      date: "2026-11-04",
      categoryId: "trans",
      amount: "250",
    });
    expect(parseEntry("11/3 groceries 800", ctx)).toMatchObject({
      date: "2026-11-03",
      categoryId: "groc",
    });
    expect(parseEntry("coffee 120 last friday", ctx).date).toBe("2026-10-30");
    expect(parseEntry("coffee 120 monday", ctx).date).toBe("2026-11-02");
    expect(parseEntry("dinner 300 dec 25", ctx).date).toBe("2025-12-25");
  });

  it("picks the currency-prefixed amount and ignores ordinals", () => {
    expect(parseEntry("2 pcs burger ₱99", ctx).amount).toBe("99");
    expect(parseEntry("13th month 20000", ctx)).toMatchObject({ kind: "income", amount: "20000" });
  });

  it("never picks system categories", () => {
    expect(parseEntry("fees 15", ctx).categoryId).toBeNull();
  });
});

describe("AI entry", () => {
  it("maps names to ids and drops bad fields", () => {
    const ai = parseAiEntry(
      'Sure! {"kind":"expense","amount":180,"category":"food","account":"GCash","toAccount":null,"date":"2026-12-01","note":"Cake for mama"}',
      ctx,
    );
    expect(ai).toEqual({
      kind: "expense",
      amount: "180",
      categoryId: "food",
      accountId: "gcash",
      toAccountId: null,
      date: null,
      note: "Cake for mama",
    });
    expect(parseAiEntry("not json", ctx)).toBeNull();
    expect(
      parseAiEntry('{"kind":"expense","category":"Grocery","account":"gcash"}', ctx),
    ).toMatchObject({
      categoryId: "groc",
      accountId: "gcash",
    });
  });

  it("keeps deterministic rule fields and fills gaps from AI", () => {
    const rule = parseEntry("cake for mama 450", ctx);
    const merged = mergeDrafts(rule, {
      kind: "expense",
      amount: "45",
      categoryId: "food",
      note: "Birthday cake",
    });
    expect(merged).toMatchObject({ amount: "450", categoryId: "food", note: "Cake for mama" });
    expect(mergeDrafts(parseEntry("450", ctx), { note: "Snacks" }).note).toBe("Snacks");
  });
});

describe("helpers", () => {
  it("normalizes Ollama URLs", () => {
    expect(normalizeOllamaUrl("localhost:11434")).toBe("http://localhost:11434");
    expect(normalizeOllamaUrl("")).toBe("http://localhost:11434");
    expect(normalizeOllamaUrl("ftp://x")).toBeNull();
  });

  it("renders lite markdown safely", () => {
    expect(renderMarkdownLite("Hi\n- one\n2. two")).toEqual([
      { bullet: false, text: "Hi" },
      { bullet: true, text: "one" },
      { bullet: true, text: "two" },
    ]);
    expect(splitBold("a **b** c")).toEqual([
      { bold: false, text: "a " },
      { bold: true, text: "b" },
      { bold: false, text: " c" },
    ]);
  });

  it("builds rule tips from a snapshot", () => {
    const snap: AssistantSnapshot = {
      today: "2026-11-06",
      name: "Juan",
      pigName: "Oink",
      month: {
        label: "November",
        spent: 500000,
        earned: 0,
        net: -500000,
        savingsRate: null,
        avgPerDay: 80000,
        projected: 2400000,
        daysLeft: 24,
        prevSpent: 0,
      },
      categories: [],
      budgets: [
        {
          name: "Food",
          amount: 300000,
          spent: 400000,
          remaining: -100000,
          pct: 133,
          status: "over",
        },
      ],
      safePerDay: null,
      nextPayday: null,
      bills: [],
      forecast: { lowDate: "2026-11-20", lowBalance: -5000, endBalance: 0, until: "2026-12-06" },
      balance: 0,
      accounts: [],
      goals: [],
      debts: { iOwe: 0, owedToMe: 0, overdue: 0 },
      biggest: [],
      tags: [],
    };
    const tips = ruleTips(snap);
    expect(tips[0]?.text).toContain("Food is over budget by ₱1,000");
    expect(tips.some((t) => t.text.includes("-₱50"))).toBe(true);
  });
});

describe("category priority", () => {
  it("prefers gifts over family for birthday items", () => {
    const c: EntryContext = {
      ...ctx,
      categories: [
        { id: "fam", name: "Family & Padala", kind: "expense" },
        { id: "gift", name: "Gifts", kind: "expense" },
      ],
    };
    expect(parseEntry("birthday cake for mama 450", c).categoryId).toBe("gift");
    expect(parseEntry("padala kay mama 2000", c).categoryId).toBe("fam");
  });
});

describe("model catalog", () => {
  it("recommends lighter models for phones and low-memory devices", async () => {
    const { recommendedWebllm } = await import("./models");
    expect(recommendedWebllm(true, null)?.label).toMatch(/^Fast/);
    expect(recommendedWebllm(false, 16)?.label).toMatch(/^Balanced/);
    expect(recommendedWebllm(true, 2)?.label).toMatch(/^Tiny/);
  });

  it("uses tier names instead of model brands", async () => {
    const { WEBLLM_MODELS, OLLAMA_MODELS, ollamaLabel, friendlyProgress } =
      await import("./models");
    for (const m of [...WEBLLM_MODELS, ...OLLAMA_MODELS])
      expect(m.label).toMatch(/^(Tiny|Fast|Balanced|Smart) · /);
    expect(ollamaLabel("qwen2.5:3b")).toBe("Balanced · 3B");
    expect(friendlyProgress("Fetching param cache[1/7]", 0.42)).toBe("Downloading… 42%");
  });
});
