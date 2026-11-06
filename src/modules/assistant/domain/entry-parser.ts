import { addDays, type Ymd } from "@/shared/kernel/time";

export type EntryKind = "expense" | "income" | "transfer";

export type EntryContext = {
  today: Ymd;
  categories: { id: string; name: string; kind: "expense" | "income"; system?: string | null }[];
  accounts: { id: string; name: string }[];
};

export type EntryDraft = {
  kind: EntryKind;
  amount: string | null;
  categoryId: string | null;
  accountId: string | null;
  toAccountId: string | null;
  date: Ymd | null;
  note: string;
};

const KEYWORD_TEXT: Record<string, string> = {
  Food: "jollibee jolibee mcdo mcdonalds kfc chowking mang_inasal greenwich shakeys pizza burger lunch dinner breakfast brunch merienda snack snacks coffee kape starbucks milktea milk_tea food foodpanda grabfood kain ulam resto restaurant karinderya bread tinapay",
  Groceries: "grocery groceries puregold savemore supermarket palengke market landers s&r alfamart",
  Transport:
    "jeep jeepney grab angkas joyride tricycle trike bus mrt lrt taxi fare pamasahe gas fuel gasoline gasolina diesel parking toll beep ride",
  "Bills & Utilities":
    "meralco kuryente electricity electric water maynilad manila_water tubig bill bills",
  Rent: "rent upa renta dorm apartment",
  "Load & Internet": "load internet wifi pldt converge globe smart dito prepaid postpaid data",
  Shopping: "shopee lazada shein clothes damit shoes sapatos uniqlo mall shopping",
  Health:
    "medicine gamot mercury pharmacy botika doctor checkup check-up hospital clinic dentist vitamins",
  Education: "tuition school books book matrikula course seminar",
  Gifts: "gift regalo birthday pasalubong",
  "Family & Padala": "padala family nanay tatay mama papa lola lolo anak",
  Entertainment: "movie movies cinema sine concert games steam inuman karaoke videoke",
  Subscriptions: "netflix spotify youtube disney icloud google_one chatgpt subscription hbo",
  "Personal Care": "haircut gupit salon barber barbershop skincare spa massage nails watsons",
  Salary: "salary sahod sweldo payroll payslip",
  Freelance: "freelance client commission gig upwork",
  Business: "business benta sales sold negosyo",
  "13th Month": "13th_month 13th",
  Allowance: "allowance baon",
  Refund: "refund cashback rebate",
};

const KEYWORDS = Object.fromEntries(
  Object.entries(KEYWORD_TEXT).map(([k, v]) => [k, v.split(" ").map((w) => w.replace(/_/g, " "))]),
);

const INCOME_WORDS = [
  ...["Salary", "Freelance", "Business", "13th Month", "Allowance", "Refund"].flatMap(
    (k) => KEYWORDS[k] ?? [],
  ),
  ..."received got_paid income kita natanggap bonus earned"
    .split(" ")
    .map((w) => w.replace(/_/g, " ")),
];

const TRANSFER_WORDS = "transfer transferred move moved lipat cash_in cashin withdraw withdrew"
  .split(" ")
  .map((w) => w.replace(/_/g, " "));

const FILLER = new Set(
  "for at sa using via from to paid pay spent on with php pesos peso p and the a an ng na worth of in bought buy ko i".split(
    " ",
  ),
);

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (phrase: string, flags = "i") =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${escape(phrase).replace(/\s+/g, "\\s+")}(?![\\p{L}\\p{N}])`,
    `${flags}u`,
  );
const has = (text: string, phrase: string) => wordRe(phrase).test(text);

const weekdayOf = (ymd: Ymd) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
const pad = (n: number) => String(n).padStart(2, "0");

function extractDate(text: string, today: Ymd): { date: Ymd | null; text: string } {
  const rules: [RegExp, (m: RegExpMatchArray) => Ymd | null][] = [
    [/\b(yesterday|kahapon)\b/i, () => addDays(today, -1)],
    [/\b(today|ngayon|kanina)\b/i, () => today],
    [/\b(\d{1,2})\s+days?\s+ago\b/i, (m) => addDays(today, -Math.min(366, Number(m[1])))],
    [
      /\b(last\s+)?(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)[a-z]*\b/i,
      (m) => {
        const target = WEEKDAYS.indexOf((m[2] ?? "").slice(0, 3).toLowerCase());
        let back = (weekdayOf(today) - target + 7) % 7;
        if (m[1] && back === 0) back = 7;
        return addDays(today, -back);
      },
    ],
    [
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i,
      (m) =>
        monthDay(MONTHS.indexOf((m[1] ?? "").slice(0, 3).toLowerCase()) + 1, Number(m[2]), today),
    ],
    [/\b(\d{1,2})\/(\d{1,2})\b/, (m) => monthDay(Number(m[1]), Number(m[2]), today)],
  ];
  for (const [re, fn] of rules) {
    const m = text.match(re);
    if (!m) continue;
    const date = fn(m);
    if (date) return { date, text: text.replace(m[0], " ") };
  }
  return { date: null, text };
}

function monthDay(month: number, day: number, today: Ymd): Ymd | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const year = Number(today.slice(0, 4));
  for (const y of [year, year - 1]) {
    const ymd = `${String(y)}-${pad(month)}-${pad(day)}`;
    const d = new Date(`${ymd}T12:00:00Z`);
    if (d.getUTCMonth() + 1 !== month) return null;
    if (ymd <= today) return ymd;
  }
  return null;
}

const AMOUNT_RE =
  /(₱|php\s?|p(?=\d))?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s?(k)?(?![\p{L}\p{N}/])/giu;

function extractAmount(text: string): { amount: string | null; text: string } {
  let best: { value: number; raw: string; prefixed: boolean } | null = null;
  for (const m of text.matchAll(AMOUNT_RE)) {
    const whole = (m[2] ?? "").replace(/,/g, "");
    let value = Number(`${whole}.${m[3] ?? "0"}`);
    if (m[4]) value *= 1000;
    if (!Number.isFinite(value) || value <= 0) continue;
    const prefixed = Boolean(m[1]);
    if (!best || (prefixed && !best.prefixed) || (prefixed === best.prefixed && value > best.value))
      best = { value, raw: m[0], prefixed };
  }
  if (!best) return { amount: null, text };
  const amount = Number.isInteger(best.value) ? String(best.value) : best.value.toFixed(2);
  return { amount, text: text.replace(best.raw, " ") };
}

function matchAccounts(text: string, accounts: EntryContext["accounts"]) {
  const found: { id: string; index: number; phrase: string }[] = [];
  const firstWords = new Map<string, number>();
  for (const a of accounts) {
    const w = a.name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    firstWords.set(w, (firstWords.get(w) ?? 0) + 1);
  }
  const sorted = [...accounts].sort((a, b) => b.name.length - a.name.length);
  let rest = text;
  for (const a of sorted) {
    const first = a.name.trim().split(/\s+/)[0] ?? "";
    const phrases = [a.name.trim()];
    if (
      first.length >= 3 &&
      first.toLowerCase() !== a.name.trim().toLowerCase() &&
      firstWords.get(first.toLowerCase()) === 1
    )
      phrases.push(first);
    for (const phrase of phrases) {
      const m = wordRe(phrase).exec(rest);
      if (!m) continue;
      found.push({ id: a.id, index: m.index, phrase: m[0] });
      rest = rest.slice(0, m.index) + " ".repeat(m[0].length) + rest.slice(m.index + m[0].length);
      break;
    }
  }
  found.sort((a, b) => a.index - b.index);
  return { found, text: rest };
}

function matchCategory(
  text: string,
  kind: "expense" | "income",
  categories: EntryContext["categories"],
) {
  const pool = categories.filter((c) => c.kind === kind && !c.system);
  const byName = [...pool]
    .sort((a, b) => b.name.length - a.name.length)
    .find((c) => has(text, c.name));
  if (byName) return byName.id;
  for (const [canonical, words] of Object.entries(KEYWORDS)) {
    if (!words.some((w) => has(text, w))) continue;
    const cat = pool.find((c) => c.name.toLowerCase() === canonical.toLowerCase());
    if (cat) return cat.id;
  }
  return null;
}

function cleanNote(text: string) {
  const words = text.replace(/[,]+/g, " ").split(/\s+/).filter(Boolean);
  while (words.length && FILLER.has((words[0] ?? "").toLowerCase())) words.shift();
  while (words.length && FILLER.has((words.at(-1) ?? "").toLowerCase())) words.pop();
  const note = words.join(" ").slice(0, 120);
  return note ? note.charAt(0).toUpperCase() + note.slice(1) : "";
}

export function parseEntry(input: string, ctx: EntryContext): EntryDraft {
  const original = input.trim().slice(0, 200);
  const dated = extractDate(original, ctx.today);
  const priced = extractAmount(dated.text);
  const accounts = matchAccounts(priced.text, ctx.accounts);
  const text = accounts.text;

  const transferish = TRANSFER_WORDS.some((w) => has(original, w)) || /\bto\b/i.test(original);
  const kind: EntryKind =
    accounts.found.length >= 2 && transferish
      ? "transfer"
      : INCOME_WORDS.some((w) => has(original, w))
        ? "income"
        : "expense";

  let accountId = accounts.found[0]?.id ?? null;
  let toAccountId: string | null = null;
  if (kind === "transfer") {
    const [a, b] = accounts.found;
    const fromFirst =
      !/\bfrom\b/i.test(original) ||
      original.toLowerCase().indexOf("from") < original.toLowerCase().indexOf(" to ");
    accountId = (fromFirst ? a : b)?.id ?? null;
    toAccountId = (fromFirst ? b : a)?.id ?? null;
  }

  return {
    kind,
    amount: priced.amount,
    categoryId: kind === "transfer" ? null : matchCategory(text, kind, ctx.categories),
    accountId,
    toAccountId,
    date: dated.date,
    note: kind === "transfer" ? cleanNote(text.replace(wordRe("to", "gi"), " ")) : cleanNote(text),
  };
}
