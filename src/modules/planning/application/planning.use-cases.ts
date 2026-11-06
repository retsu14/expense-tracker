import type { LedgerDeps } from "@/modules/ledger/application/deps";
import { createTransaction, getSettings } from "@/modules/ledger/application/ledger.use-cases";
import { evaluateAmount } from "@/modules/ledger/domain/amount-expression";
import {
  alertLevel,
  type Budget,
  budgetProgress,
  rolloverCarry,
  safeToSpendPerDay,
  suggestBudgetAmount,
  validateAlertPct,
} from "@/modules/planning/domain/budget";
import { goalProgress, type GoalStatus } from "@/modules/planning/domain/goal";
import {
  daysBetween,
  nextPayday,
  periodRange,
  previousRange,
  type Range,
} from "@/modules/planning/domain/period";
import type { Notification, PlanningRepository } from "@/modules/planning/domain/ports";
import {
  describeSchedule,
  occurrences,
  occurrenceStatus,
  postKey,
  type Recurring,
} from "@/modules/planning/domain/recurring";
import { DomainError, err, ok, type Result } from "@/shared/kernel/result";
import {
  addDays,
  addMonths,
  startOfMonth,
  toYmd,
  type Ymd,
  zonedStart,
} from "@/shared/kernel/time";
import { parse } from "@/shared/validation";

import {
  budgetInput,
  contributionInput,
  goalInput,
  markPaidInput,
  recurringInput,
} from "./schemas";

export type PlanningDeps = {
  planning: PlanningRepository;
  ledger: LedgerDeps;
};

const fieldError = (field: string, message: string) =>
  err(new DomainError("validation_failed", message, { [field]: [message] }));
const notFound = (what: string) => err(new DomainError("not_found", `${what} not found.`));
const peso = (c: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(c / 100);
const toText = (c: number) => (c / 100).toFixed(2);
const shortDate = (ymd: Ymd) =>
  new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(`${ymd}T12:00:00Z`),
  );

function money(text: string, field: string): Result<number> {
  const value = evaluateAmount(text);
  return value === null
    ? fieldError(field, "Enter a valid amount, like 5000 or 2500*2.")
    : ok(value);
}

async function context(deps: PlanningDeps, userId: string) {
  const settings = await getSettings(deps.ledger, userId);
  const now = deps.ledger.clock.now();
  return { settings, tz: settings.timezone, today: toYmd(now, settings.timezone), now };
}

async function spending(deps: PlanningDeps, userId: string, range: Range, tz: string) {
  const rows = await deps.ledger.ledger.expenseByCategory(
    userId,
    zonedStart(range.start, tz),
    zonedStart(addDays(range.end, 1), tz),
  );
  const byCategory = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    total += r.total;
    if (r.categoryId) byCategory.set(r.categoryId, r.total);
  }
  return { byCategory, total };
}

async function notify(
  deps: PlanningDeps,
  userId: string,
  n: Pick<Notification, "type" | "title" | "body" | "href" | "dedupeKey">,
) {
  return deps.planning.createNotification({ id: deps.ledger.newId(), userId, ...n });
}

export async function budgetOverview(deps: PlanningDeps, userId: string) {
  const { settings, tz, today } = await context(deps, userId);
  const [budgets, categories] = await Promise.all([
    deps.planning.listBudgets(userId),
    deps.ledger.ledger.listCategories(userId, true),
  ]);
  const catById = new Map(categories.map((c) => [c.id, c]));

  const cache = new Map<string, Promise<Awaited<ReturnType<typeof spending>>>>();
  const spentIn = (range: Range) => {
    const key = `${range.start}:${range.end}`;
    let hit = cache.get(key);
    if (!hit) {
      hit = spending(deps, userId, range, tz);
      cache.set(key, hit);
    }
    return hit;
  };
  const pick = (s: Awaited<ReturnType<typeof spending>>, b: Budget) =>
    b.categoryId ? (s.byCategory.get(b.categoryId) ?? 0) : s.total;

  const items = await Promise.all(
    budgets.map(async (b) => {
      const range = periodRange(b.period, settings.payday, today);
      const spent = pick(await spentIn(range), b);
      const carry = b.rollover
        ? rolloverCarry({
            amount: b.amount,
            spent: pick(await spentIn(previousRange(b.period, settings.payday, range)), b),
          })
        : 0;
      const category = b.categoryId ? catById.get(b.categoryId) : null;
      return {
        ...b,
        ...budgetProgress({ amount: b.amount, spent, carry, alertPct: b.alertPct }),
        range,
        daysLeft: daysBetween(today, range.end) + 1,
        name: category?.name ?? "All spending",
        icon: category?.icon ?? "wallet",
        color: category?.color ?? "#E8E2D6",
      };
    }),
  );
  items.sort((a, b) => (a.categoryId ? 1 : 0) - (b.categoryId ? 1 : 0) || b.pct - a.pct);

  const overall = items.find((i) => !i.categoryId) ?? null;
  const basis = overall ?? (items.length ? items : null);
  let safe: { perDay: number; daysLeft: number; reserved: number; range: Range } | null = null;
  if (basis) {
    const range = Array.isArray(basis)
      ? periodRange("monthly", settings.payday, today)
      : basis.range;
    const remaining = Array.isArray(basis)
      ? basis.reduce((s, i) => s + Math.max(0, i.remaining), 0)
      : basis.remaining;
    const bills = await billOccurrences(deps, userId, { from: today, to: range.end });
    const reserved = bills
      .filter((o) => o.kind === "expense" && (o.status === "due_soon" || o.status === "upcoming"))
      .reduce((s, o) => s + o.amount, 0);
    const daysLeft = daysBetween(today, range.end) + 1;
    safe = {
      perDay: safeToSpendPerDay({ remaining, reserved, daysLeft }),
      daysLeft,
      reserved,
      range,
    };
  }

  const maxPct = items.reduce((m, i) => Math.max(m, i.pct), 0);
  return {
    today,
    items,
    overall,
    safe,
    nextPayday: nextPayday(settings.payday, today),
    usedPct: overall
      ? items.some((i) => i.categoryId && i.status === "over")
        ? Math.max(overall.pct, overall.alertPct)
        : overall.pct
      : items.length
        ? maxPct
        : null,
    alertPct: overall?.alertPct ?? 80,
  };
}

export async function createBudget(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const parsed = parse(budgetInput, input);
  if (!parsed.ok) return parsed;
  const amount = money(parsed.value.amount, "amount");
  if (!amount.ok) return amount;
  const alert = validateAlertPct(parsed.value.alertPct);
  if (!alert.ok) return alert;

  const { categoryId } = parsed.value;
  if (categoryId) {
    const category = await deps.ledger.ledger.getCategory(userId, categoryId);
    if (category?.kind !== "expense") return fieldError("categoryId", "Pick an expense category.");
  }
  if (await deps.planning.findBudgetForCategory(userId, categoryId)) {
    return fieldError(
      "categoryId",
      categoryId ? "This category already has a budget." : "You already have an overall budget.",
    );
  }

  const id = deps.ledger.newId();
  await deps.planning.createBudgets([
    {
      id,
      userId,
      categoryId,
      period: parsed.value.period,
      amount: amount.value,
      rollover: parsed.value.rollover,
      alertPct: alert.value,
    },
  ]);
  return ok(id);
}

export async function updateBudget(
  deps: PlanningDeps,
  userId: string,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(budgetInput.omit({ categoryId: true }), input);
  if (!parsed.ok) return parsed;
  const amount = money(parsed.value.amount, "amount");
  if (!amount.ok) return amount;
  const alert = validateAlertPct(parsed.value.alertPct);
  if (!alert.ok) return alert;
  const updated = await deps.planning.updateBudget(userId, id, {
    amount: amount.value,
    period: parsed.value.period,
    rollover: parsed.value.rollover,
    alertPct: alert.value,
  });
  return updated ? ok(undefined) : notFound("Budget");
}

export async function deleteBudget(deps: PlanningDeps, userId: string, id: string) {
  return (await deps.planning.deleteBudget(userId, id)) ? ok(undefined) : notFound("Budget");
}

export async function budgetSuggestions(deps: PlanningDeps, userId: string) {
  const { tz, today } = await context(deps, userId);
  const range = { start: addMonths(today, -3), end: addDays(startOfMonth(today), -1) };
  const [{ byCategory }, categories, budgets] = await Promise.all([
    spending(deps, userId, range, tz),
    deps.ledger.ledger.listCategories(userId),
    deps.planning.listBudgets(userId),
  ]);
  const budgeted = new Set(budgets.map((b) => b.categoryId));
  return categories
    .filter((c) => c.kind === "expense" && !c.system)
    .map((c) => {
      const average = Math.round((byCategory.get(c.id) ?? 0) / 3);
      return {
        categoryId: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        average,
        suggested: suggestBudgetAmount(average),
        hasBudget: budgeted.has(c.id),
      };
    })
    .sort((a, b) => b.average - a.average);
}

export async function billOccurrences(
  deps: PlanningDeps,
  userId: string,
  window?: { from: Ymd; to: Ymd },
) {
  const { today } = await context(deps, userId);
  const from = window?.from ?? addDays(today, -31);
  const to = window?.to ?? addDays(today, 31);
  const [items, posts, accounts] = await Promise.all([
    deps.planning.listRecurring(userId),
    deps.planning.listPosts(userId, from, to),
    deps.ledger.ledger.listAccounts(userId, true),
  ]);
  const postBy = new Map(posts.map((p) => [`${p.recurringId}:${p.dueDate}`, p]));
  const accountName = new Map(accounts.map((a) => [a.id, a.name]));

  return items
    .filter((i) => i.active)
    .flatMap((item) =>
      occurrences(item.schedule, item.startDate > from ? item.startDate : from, to).map((due) => {
        const post = postBy.get(`${item.id}:${due}`);
        return {
          recurringId: item.id,
          name: item.name,
          kind: item.kind,
          amount: item.amount,
          autoPost: item.autoPost,
          accountName: accountName.get(item.accountId) ?? "",
          due,
          status: occurrenceStatus(due, today, item.remindDays, post),
          daysUntil: daysBetween(today, due),
        };
      }),
    )
    .filter((o) => (o.status === "paid" || o.status === "skipped" ? o.daysUntil >= -7 : true))
    .sort((a, b) => a.due.localeCompare(b.due));
}

export async function listRecurring(deps: PlanningDeps, userId: string) {
  const items = await deps.planning.listRecurring(userId);
  return items.map((i) => ({ ...i, scheduleLabel: describeSchedule(i.schedule) }));
}

async function validateRecurring(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
): Promise<Result<Omit<Recurring, "id" | "userId" | "active">>> {
  const parsed = parse(recurringInput, input);
  if (!parsed.ok) return parsed;
  const v = parsed.value;
  const amount = money(v.amount, "amount");
  if (!amount.ok) return amount;
  const [account, category] = await Promise.all([
    deps.ledger.ledger.getAccount(userId, v.accountId),
    deps.ledger.ledger.getCategory(userId, v.categoryId),
  ]);
  if (!account) return fieldError("accountId", "Pick a wallet.");
  if (category?.kind !== v.kind) return fieldError("categoryId", "Pick a matching category.");
  return ok({ ...v, amount: amount.value });
}

export async function createRecurring(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const v = await validateRecurring(deps, userId, input);
  if (!v.ok) return v;
  const id = deps.ledger.newId();
  await deps.planning.createRecurring({ ...v.value, id, userId, active: true });
  return ok(id);
}

export async function updateRecurring(
  deps: PlanningDeps,
  userId: string,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  const v = await validateRecurring(deps, userId, input);
  if (!v.ok) return v;
  return (await deps.planning.updateRecurring(userId, id, v.value))
    ? ok(undefined)
    : notFound("Bill");
}

export async function setRecurringActive(
  deps: PlanningDeps,
  userId: string,
  id: string,
  active: boolean,
) {
  return (await deps.planning.updateRecurring(userId, id, { active }))
    ? ok(undefined)
    : notFound("Bill");
}

export async function deleteRecurring(deps: PlanningDeps, userId: string, id: string) {
  return (await deps.planning.deleteRecurring(userId, id)) ? ok(undefined) : notFound("Bill");
}

export async function markOccurrence(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
  status: "paid" | "skipped",
): Promise<Result<{ transactionId: string | null }>> {
  const parsed = parse(markPaidInput, input);
  if (!parsed.ok) return parsed;
  const item = await deps.planning.getRecurring(userId, parsed.value.recurringId);
  if (!item) return notFound("Bill");

  let transactionId: string | null = null;
  if (status === "paid") {
    const { today } = await context(deps, userId);
    const tx = await createTransaction(deps.ledger, userId, {
      kind: item.kind,
      amount: parsed.value.amount ?? toText(item.amount),
      accountId: parsed.value.accountId ?? item.accountId,
      categoryId: item.categoryId,
      date: today,
      note: item.name,
      idempotencyKey: postKey(item.id, parsed.value.dueDate),
    });
    if (!tx.ok) return tx;
    transactionId = tx.value.id;
  }

  await deps.planning.savePost(userId, {
    recurringId: item.id,
    dueDate: parsed.value.dueDate,
    status,
    transactionId,
  });
  return ok({ transactionId });
}

export async function autoPostDue(deps: PlanningDeps, userId: string) {
  const { today } = await context(deps, userId);
  const from = addDays(today, -60);
  const [items, posts] = await Promise.all([
    deps.planning.listRecurring(userId),
    deps.planning.listPosts(userId, from, today),
  ]);
  const posted = new Set(posts.map((p) => `${p.recurringId}:${p.dueDate}`));
  let count = 0;

  for (const item of items.filter((i) => i.active && i.autoPost)) {
    const start = item.startDate > from ? item.startDate : from;
    for (const due of occurrences(item.schedule, start, today)) {
      if (posted.has(`${item.id}:${due}`)) continue;
      const tx = await createTransaction(deps.ledger, userId, {
        kind: item.kind,
        amount: toText(item.amount),
        accountId: item.accountId,
        categoryId: item.categoryId,
        date: due,
        time: "09:00",
        note: item.name,
        idempotencyKey: postKey(item.id, due),
      });
      if (!tx.ok) continue;
      await deps.planning.savePost(userId, {
        recurringId: item.id,
        dueDate: due,
        status: "paid",
        transactionId: tx.value.id,
      });
      count++;
      await notify(deps, userId, {
        type: "recurring",
        title: `${item.name} recorded`,
        body: `${item.kind === "income" ? "+" : "−"}${peso(item.amount)} on ${shortDate(due)}.`,
        href: "/activity",
        dedupeKey: `posted:${item.id}:${due}`,
      });
    }
  }
  return count;
}

export async function checkBills(deps: PlanningDeps, userId: string) {
  const { today } = await context(deps, userId);
  const occ = await billOccurrences(deps, userId, {
    from: addDays(today, -31),
    to: addDays(today, 14),
  });
  for (const o of occ) {
    if (o.kind !== "expense" || o.autoPost) continue;
    if (o.status !== "overdue" && o.status !== "due_soon") continue;
    const when =
      o.status === "overdue"
        ? "is overdue"
        : o.daysUntil === 0
          ? "is due today"
          : `is due in ${o.daysUntil} ${o.daysUntil === 1 ? "day" : "days"}`;
    await notify(deps, userId, {
      type: "bill",
      title: `${o.name} ${when}`,
      body: `${peso(o.amount)} · due ${shortDate(o.due)}`,
      href: "/plan/bills",
      dedupeKey: `bill:${o.recurringId}:${o.due}:${o.status === "overdue" ? "overdue" : "soon"}`,
    });
  }
}

export async function checkBudgetAlerts(deps: PlanningDeps, userId: string) {
  const overview = await budgetOverview(deps, userId);
  const alerts: { title: string; body: string; level: 1 | 2 }[] = [];
  for (const b of overview.items) {
    const level = alertLevel(b.pct, b.alertPct);
    if (level === 0) continue;
    const title = level === 2 ? `Over budget: ${b.name}` : `${b.name} is at ${Math.round(b.pct)}%`;
    const body =
      level === 2
        ? `You've spent ${peso(b.spent)} of ${peso(b.limit)}.`
        : `${peso(Math.max(0, b.remaining))} left until ${shortDate(b.range.end)}.`;
    const created = await notify(deps, userId, {
      type: "budget",
      title,
      body,
      href: "/plan",
      dedupeKey: `budget:${b.id}:${b.range.start}:${level}`,
    });
    if (created) alerts.push({ title, body, level });
  }
  return alerts;
}

export async function syncPlanning(deps: PlanningDeps, userId: string) {
  await autoPostDue(deps, userId);
  await checkBills(deps, userId);
  await checkBudgetAlerts(deps, userId);
}

export async function listGoals(deps: PlanningDeps, userId: string) {
  const { today } = await context(deps, userId);
  const goals = await deps.planning.listGoals(userId);
  return goals.map((g) => goalProgress(g, g.saved, today));
}

export async function createGoal(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
): Promise<Result<string>> {
  const parsed = parse(goalInput, input);
  if (!parsed.ok) return parsed;
  const target = money(parsed.value.target, "target");
  if (!target.ok) return target;
  const id = deps.ledger.newId();
  await deps.planning.createGoal({
    id,
    userId,
    name: parsed.value.name,
    target: target.value,
    deadline: parsed.value.deadline,
    icon: parsed.value.icon,
    color: parsed.value.color,
    status: "active",
    completedAt: null,
  });
  return ok(id);
}

export async function updateGoal(
  deps: PlanningDeps,
  userId: string,
  id: string,
  input: unknown,
): Promise<Result<void>> {
  const parsed = parse(goalInput, input);
  if (!parsed.ok) return parsed;
  const target = money(parsed.value.target, "target");
  if (!target.ok) return target;
  const updated = await deps.planning.updateGoal(userId, id, {
    name: parsed.value.name,
    target: target.value,
    deadline: parsed.value.deadline,
    icon: parsed.value.icon,
    color: parsed.value.color,
  });
  return updated ? ok(undefined) : notFound("Goal");
}

export async function setGoalStatus(
  deps: PlanningDeps,
  userId: string,
  id: string,
  status: GoalStatus,
) {
  const updated = await deps.planning.updateGoal(userId, id, {
    status,
    completedAt: status === "completed" ? deps.ledger.clock.now() : null,
  });
  return updated ? ok(undefined) : notFound("Goal");
}

export async function deleteGoal(deps: PlanningDeps, userId: string, id: string) {
  return (await deps.planning.deleteGoal(userId, id)) ? ok(undefined) : notFound("Goal");
}

export async function contributeToGoal(
  deps: PlanningDeps,
  userId: string,
  input: unknown,
): Promise<Result<{ saved: number; completed: boolean }>> {
  const parsed = parse(contributionInput, input);
  if (!parsed.ok) return parsed;
  const amount = money(parsed.value.amount, "amount");
  if (!amount.ok) return amount;
  const goal = await deps.planning.getGoal(userId, parsed.value.goalId);
  if (!goal) return notFound("Goal");

  const signed = parsed.value.direction === "withdraw" ? -amount.value : amount.value;
  if (goal.saved + signed < 0) {
    return fieldError("amount", `You only have ${peso(goal.saved)} saved here.`);
  }

  await deps.planning.addContribution({
    id: deps.ledger.newId(),
    goalId: goal.id,
    userId,
    amount: signed,
    note: parsed.value.note,
  });

  const saved = goal.saved + signed;
  const completed = goal.status === "active" && saved >= goal.target;
  if (completed) {
    await deps.planning.updateGoal(userId, goal.id, {
      status: "completed",
      completedAt: deps.ledger.clock.now(),
    });
    await notify(deps, userId, {
      type: "goal",
      title: `Goal reached: ${goal.name}! 🎉`,
      body: `You saved ${peso(saved)}. Oink oink!`,
      href: "/plan/goals",
      dedupeKey: `goal:${goal.id}:completed`,
    });
  }
  return ok({ saved, completed });
}

export async function listNotifications(deps: PlanningDeps, userId: string) {
  return deps.planning.listNotifications(userId, 50);
}

export async function unreadNotifications(deps: PlanningDeps, userId: string) {
  return deps.planning.unreadCount(userId);
}

export async function markNotificationsRead(deps: PlanningDeps, userId: string) {
  await deps.planning.markAllRead(userId, deps.ledger.clock.now());
}
