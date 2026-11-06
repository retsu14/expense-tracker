import type { Ymd } from "@/shared/kernel/time";

export type AssistantSnapshot = {
  today: Ymd;
  name: string;
  pigName: string;
  month: {
    label: string;
    spent: number;
    earned: number;
    net: number;
    savingsRate: number | null;
    avgPerDay: number;
    projected: number;
    daysLeft: number;
    prevSpent: number;
  };
  categories: { name: string; total: number; share: number; delta: number | null }[];
  budgets: {
    name: string;
    amount: number;
    spent: number;
    remaining: number;
    pct: number;
    status: string;
  }[];
  safePerDay: number | null;
  nextPayday: Ymd | null;
  bills: { name: string; amount: number; due: Ymd; status: string }[];
  forecast: { lowDate: Ymd; lowBalance: number; endBalance: number; until: Ymd };
  balance: number;
  accounts: { name: string; balance: number }[];
  goals: {
    name: string;
    target: number;
    saved: number;
    pct: number;
    deadline: Ymd | null;
    monthlyNeeded: number | null;
  }[];
  debts: { iOwe: number; owedToMe: number; overdue: number };
  biggest: { label: string; amount: number; day: Ymd }[];
  tags: string[];
};

export type Tip = { tone: "good" | "warn" | "info"; text: string };

const peso = (centavos: number) =>
  `${centavos < 0 ? "-" : ""}₱${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(Math.abs(Math.round(centavos / 100)))}`;

export function snapshotToText(s: AssistantSnapshot) {
  const m = s.month;
  const lines = [
    `Today: ${s.today}. User: ${s.name}. Currency: PHP.`,
    `${m.label}: spent ${peso(m.spent)}, earned ${peso(m.earned)}, net ${peso(m.net)}${m.savingsRate !== null ? `, savings rate ${String(m.savingsRate)}%` : ""}.`,
    `Average spend per day ${peso(m.avgPerDay)}; projected month spend ${peso(m.projected)}; ${String(m.daysLeft)} days left in month.`,
    `Last month (full) spent ${peso(m.prevSpent)}.`,
    `Total balance ${peso(s.balance)} across: ${s.accounts.map((a) => `${a.name} ${peso(a.balance)}`).join(", ") || "none"}.`,
  ];
  if (s.categories.length)
    lines.push(
      `Top spending: ${s.categories.map((c) => `${c.name} ${peso(c.total)} (${String(c.share)}%${c.delta !== null ? `, ${c.delta > 0 ? "+" : ""}${String(c.delta)}% vs all of last month` : ""})`).join("; ")}.`,
    );
  if (s.budgets.length)
    lines.push(
      `Budgets: ${s.budgets.map((b) => `${b.name} ${peso(b.spent)} of ${peso(b.amount)} (${String(Math.round(b.pct))}%, ${b.remaining >= 0 ? `${peso(b.remaining)} left` : `over by ${peso(-b.remaining)}`})`).join("; ")}.`,
    );
  else lines.push("No budgets set.");
  if (s.safePerDay !== null) lines.push(`Safe to spend per day: ${peso(s.safePerDay)}.`);
  if (s.nextPayday) lines.push(`Next payday: ${s.nextPayday}.`);
  if (s.bills.length)
    lines.push(
      `Upcoming bills: ${s.bills.map((b) => `${b.name} ${peso(b.amount)} due ${b.due}${b.status === "overdue" ? " (OVERDUE)" : ""}`).join("; ")}.`,
    );
  lines.push(
    `30-day balance forecast: lowest ${peso(s.forecast.lowBalance)} on ${s.forecast.lowDate}, ${peso(s.forecast.endBalance)} by ${s.forecast.until}.`,
  );
  if (s.goals.length)
    lines.push(
      `Goals: ${s.goals.map((g) => `${g.name} ${peso(g.saved)}/${peso(g.target)} (${String(Math.round(g.pct))}%${g.deadline ? `, by ${g.deadline}` : ""}${g.monthlyNeeded ? `, needs ${peso(g.monthlyNeeded)}/month` : ""})`).join("; ")}.`,
    );
  if (s.debts.iOwe || s.debts.owedToMe)
    lines.push(
      `Utang: user owes ${peso(s.debts.iOwe)}, others owe user ${peso(s.debts.owedToMe)}${s.debts.overdue ? `, ${String(s.debts.overdue)} overdue` : ""}.`,
    );
  if (s.biggest.length)
    lines.push(
      `Biggest expenses: ${s.biggest.map((b) => `${b.label} ${peso(b.amount)} on ${b.day}`).join("; ")}.`,
    );
  if (s.tags.length) lines.push(`Common tags: ${s.tags.map((t) => `#${t}`).join(", ")}.`);
  return lines.join("\n");
}

export function ruleTips(s: AssistantSnapshot): Tip[] {
  const tips: Tip[] = [];
  const m = s.month;
  const over = s.budgets.filter((b) => b.remaining < 0);
  const near = s.budgets.filter((b) => b.remaining >= 0 && b.pct >= 80);

  if (m.spent === 0 && m.earned === 0)
    tips.push({
      tone: "info",
      text: "No entries yet this month. Log your first one and I'll start crunching!",
    });
  for (const b of over.slice(0, 2))
    tips.push({
      tone: "warn",
      text: `${b.name} is over budget by ${peso(-b.remaining)}. Try a few no-spend days to recover.`,
    });
  for (const b of near.slice(0, 2))
    tips.push({
      tone: "warn",
      text: `${b.name} is at ${String(Math.round(b.pct))}% with ${peso(b.remaining)} left. Slow down a little.`,
    });
  if (s.safePerDay !== null && s.safePerDay > 0)
    tips.push({
      tone: "info",
      text: `You can safely spend about ${peso(s.safePerDay)} a day until your next budget reset.`,
    });
  if (s.forecast.lowBalance < 0)
    tips.push({
      tone: "warn",
      text: `Heads up: your balance may dip to ${peso(s.forecast.lowBalance)} around ${s.forecast.lowDate}. Plan for upcoming bills.`,
    });
  const overdue = s.bills.filter((b) => b.status === "overdue");
  if (overdue.length)
    tips.push({
      tone: "warn",
      text: `${overdue.map((b) => b.name).join(", ")} ${overdue.length > 1 ? "are" : "is"} overdue. Pay soon to avoid fees.`,
    });
  const jump = s.categories.find((c) => c.delta !== null && c.delta >= 30 && c.share >= 10);
  if (jump)
    tips.push({
      tone: "info",
      text: `${jump.name} is already up ${String(jump.delta)}% vs all of last month. Worth a look?`,
    });
  if (m.savingsRate !== null && m.savingsRate >= 20)
    tips.push({
      tone: "good",
      text: `You're saving ${String(m.savingsRate)}% of your income. Ang galing! 🎉`,
    });
  else if (m.earned > 0 && m.net < 0)
    tips.push({
      tone: "warn",
      text: `You've spent ${peso(-m.net)} more than you earned this month.`,
    });
  const goal = s.goals.find((g) => g.monthlyNeeded && g.pct < 100);
  if (goal?.monthlyNeeded)
    tips.push({
      tone: "info",
      text: `Set aside ${peso(goal.monthlyNeeded)} a month to reach "${goal.name}" on time.`,
    });
  if (s.debts.overdue)
    tips.push({
      tone: "warn",
      text: `You have ${String(s.debts.overdue)} overdue utang. A quick message can sort it out.`,
    });
  if (!s.budgets.length && m.spent > 0)
    tips.push({
      tone: "info",
      text: "Set a monthly budget so I can warn you before you overspend.",
    });
  if (!tips.length)
    tips.push({
      tone: "good",
      text: "Everything looks on track. Keep logging and I'll keep watch! 🐷",
    });
  return tips.slice(0, 5);
}
