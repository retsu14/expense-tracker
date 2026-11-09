export const HEALTH_LEVELS = ["thriving", "healthy", "thin", "famished"] as const;

export type Health = (typeof HEALTH_LEVELS)[number];

export type HealthSignals = {
  hasData: boolean;
  budgetUsedPct: number | null;
  alertPct: number;
  overBudget: string[];
  earned: number;
  spent: number;
  balance: number;
  forecastLow: number | null;
  overdueBills: number;
  overdueDebts: number;
  owed: number;
};

export type HealthReason = { text: string; good: boolean };

export type HealthReport = { score: number; level: Health; reasons: HealthReason[] };

export const HEALTH_LABEL: Record<Health, string> = {
  thriving: "Thriving",
  healthy: "Healthy",
  thin: "Getting thin",
  famished: "Starving",
};

export function healthLevel(score: number): Health {
  if (score >= 80) return "thriving";
  if (score >= 55) return "healthy";
  if (score >= 30) return "thin";
  return "famished";
}

const plural = (n: number, one: string, many = `${one}s`) => `${String(n)} ${n === 1 ? one : many}`;

export function assessHealth(s: HealthSignals): HealthReport {
  if (!s.hasData)
    return {
      score: 70,
      level: "healthy",
      reasons: [{ text: "Log a few entries to get a score", good: true }],
    };

  let score = 100;
  const bad: HealthReason[] = [];
  const good: HealthReason[] = [];
  const hit = (points: number, text: string) => {
    score -= points;
    bad.push({ text, good: false });
  };

  if (s.balance < 0) hit(30, "Balance below zero");
  if (s.budgetUsedPct !== null) {
    if (s.budgetUsedPct > 100) hit(35, "Over budget");
    else if (s.budgetUsedPct >= s.alertPct)
      hit(15, `${String(Math.round(s.budgetUsedPct))}% of budget used`);
    else good.push({ text: "Within budget", good: true });
  }
  if (s.overBudget.length)
    hit(
      Math.min(20, s.overBudget.length * 10),
      s.overBudget.length === 1
        ? `${s.overBudget[0] ?? "A category"} over budget`
        : `${plural(s.overBudget.length, "category", "categories")} over budget`,
    );
  if (s.spent > s.earned && s.earned > 0) hit(20, "Spent more than earned");
  else if (s.earned > 0 && s.earned - s.spent >= s.earned * 0.2)
    good.push({ text: "Saving 20%+ of income", good: true });
  if (s.forecastLow !== null && s.forecastLow < 0 && s.balance >= 0)
    hit(20, "May run short before payday");
  if (s.overdueBills)
    hit(Math.min(20, s.overdueBills * 10), `${plural(s.overdueBills, "bill")} overdue`);
  else good.push({ text: "No overdue bills", good: true });
  if (s.overdueDebts)
    hit(Math.min(20, s.overdueDebts * 10), `${plural(s.overdueDebts, "utang", "utang")} overdue`);
  else if (s.owed > 0) hit(5, "Paying off utang");
  else good.push({ text: "No utang", good: true });

  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, level: healthLevel(clamped), reasons: [...bad, ...good].slice(0, 3) };
}
