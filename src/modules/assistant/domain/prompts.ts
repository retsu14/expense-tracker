import type { Ymd } from "@/shared/kernel/time";

import type { EntryContext, EntryDraft, EntryKind } from "./entry-parser";

export type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

export type GenerateOptions = {
  signal?: AbortSignal;
  onText?: (full: string) => void;
  json?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
};

export type AssistantProvider = {
  generate(messages: ChatMessage[], opts?: GenerateOptions): Promise<string>;
};

export const MAX_HISTORY = 6;

export function chatSystemPrompt(pigName: string, data: string) {
  return `You are ${pigName}, a cute, upbeat pink pig who is the user's money buddy inside the Oink expense tracker app (Philippines, pesos ₱).
Rules:
- Answer using ONLY the data below. Never invent numbers, transactions or dates. If the data doesn't cover it, say so and suggest what to log or check in the app.
- Be short: 2-5 sentences or up to 5 bullet points. Plain words, friendly, a little playful. A light Taglish word is okay.
- Do math carefully and show the key number.
- Give practical, specific suggestions (budgets, no-spend days, bills, goals). No investment, loan or tax advice; for those, suggest a licensed professional.
- Never ask for passwords, account numbers or personal IDs.

USER DATA (computed by the app):
${data}`;
}

export function summaryPrompt(data: string) {
  return `Write a short monthly money check-in for the user from the data below.
Format: exactly 3 bullet points starting with "- ", each under 25 words: 1) how the month is going, 2) the most important thing to watch, 3) one specific action for this week. Use real numbers from the data only. Friendly pig tone, no greeting, no sign-off.

DATA:
${data}`;
}

export const ENTRY_SCHEMA = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["expense", "income", "transfer"] },
    amount: { type: ["number", "null"] },
    category: { type: ["string", "null"] },
    account: { type: ["string", "null"] },
    toAccount: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    note: { type: "string" },
  },
  required: ["kind", "amount", "category", "account", "toAccount", "date", "note"],
} as const;

export function entryPrompt(text: string, ctx: EntryContext) {
  const exp = ctx.categories.filter((c) => c.kind === "expense" && !c.system).map((c) => c.name);
  const inc = ctx.categories.filter((c) => c.kind === "income" && !c.system).map((c) => c.name);
  return `Turn the user's note into a money entry for a Philippine expense tracker. Today is ${ctx.today}.
Expense categories: ${exp.join(", ")}.
Income categories: ${inc.join(", ")}.
Wallets: ${ctx.accounts.map((a) => a.name).join(", ")}.
Reply with JSON only: {"kind","amount","category","account","toAccount","date","note"}.
- kind: "expense", "income" or "transfer" (money moved between two of the wallets).
- amount: number in pesos, or null. "1.5k" = 1500.
- category: one name from the lists above that best fits, or null.
- account / toAccount: wallet names from the list, or null.
- date: YYYY-MM-DD or null if not mentioned.
- note: short description (e.g. "Jollibee lunch"), no amount, no wallet, no date.

User note: ${JSON.stringify(text)}`;
}

type AiEntry = {
  kind?: unknown;
  amount?: unknown;
  category?: unknown;
  account?: unknown;
  toAccount?: unknown;
  date?: unknown;
  note?: unknown;
};

const KINDS: EntryKind[] = ["expense", "income", "transfer"];
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const singular = (w: string) => w.toLowerCase().trim().replace(/ies$/, "y").replace(/s$/, "");

function byName<T extends { name: string }>(list: T[], name: string | null) {
  if (!name) return null;
  const n = singular(name);
  const exact = list.find((x) => singular(x.name) === n);
  if (exact || n.length < 3) return exact ?? null;
  return list.find((x) => singular(x.name).startsWith(n) || n.startsWith(singular(x.name))) ?? null;
}

export function parseAiEntry(raw: string, ctx: EntryContext): Partial<EntryDraft> | null {
  let data: AiEntry;
  try {
    const json = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null) return null;
    data = parsed;
  } catch {
    return null;
  }
  const kind = KINDS.find((k) => k === data.kind) ?? "expense";
  const amount =
    typeof data.amount === "number" && Number.isFinite(data.amount) && data.amount > 0
      ? String(Math.round(data.amount * 100) / 100)
      : null;
  const category = byName(
    ctx.categories.filter((c) => c.kind === kind && !c.system),
    str(data.category),
  );
  const account = byName(ctx.accounts, str(data.account));
  const toAccount = byName(ctx.accounts, str(data.toAccount));
  const date = str(data.date);
  const validDate: Ymd | null =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= ctx.today && !Number.isNaN(Date.parse(date))
      ? date
      : null;
  return {
    kind,
    amount,
    categoryId: category?.id ?? null,
    accountId: account?.id ?? null,
    toAccountId: kind === "transfer" ? (toAccount?.id ?? null) : null,
    date: validDate,
    note: (str(data.note) ?? "").slice(0, 120),
  };
}

export function mergeDrafts(rule: EntryDraft, ai: Partial<EntryDraft> | null): EntryDraft {
  if (!ai) return rule;
  const kind = rule.kind === "transfer" ? "transfer" : (ai.kind ?? rule.kind);
  return {
    kind,
    amount: rule.amount ?? ai.amount ?? null,
    categoryId:
      kind === "transfer"
        ? null
        : kind === rule.kind && rule.categoryId
          ? rule.categoryId
          : (ai.categoryId ?? null),
    accountId: rule.accountId ?? ai.accountId ?? null,
    toAccountId: rule.toAccountId ?? ai.toAccountId ?? null,
    date: rule.date ?? ai.date ?? null,
    note: rule.note.trim() ? rule.note : (ai.note ?? ""),
  };
}

export function renderMarkdownLite(text: string) {
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const bullet = /^([-*•]|\d+[.)])\s+/.exec(line);
      return { bullet: Boolean(bullet), text: bullet ? line.slice(bullet[0].length) : line };
    });
}

export function splitBold(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4
        ? { bold: true, text: part.slice(2, -2) }
        : { bold: false, text: part },
    );
}
