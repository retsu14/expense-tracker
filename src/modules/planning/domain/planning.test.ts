import { describe, expect, it } from "vitest";

import { alertLevel, budgetProgress, safeToSpendPerDay, suggestBudgetAmount } from "./budget";
import { goalProgress } from "./goal";
import { monthRange, nextPayday, payCycleRange, previousRange } from "./period";
import { describeSchedule, occurrences, occurrenceStatus } from "./recurring";

const semi = { type: "semi_monthly" as const, days: [15, 30] as [number, number] };

describe("periods", () => {
  it("computes month and semi-monthly pay cycles, clamping short months", () => {
    expect(monthRange("2026-02-10")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(payCycleRange(semi, "2026-03-20")).toEqual({ start: "2026-03-15", end: "2026-03-29" });
    expect(payCycleRange(semi, "2026-03-05")).toEqual({ start: "2026-02-28", end: "2026-03-14" });
    expect(payCycleRange(semi, "2026-02-28")).toEqual({ start: "2026-02-28", end: "2026-03-14" });
    expect(nextPayday(semi, "2026-03-15")).toBe("2026-03-30");
  });

  it("handles monthly and weekly paydays", () => {
    expect(payCycleRange({ type: "monthly", day: 25 }, "2026-03-10")).toEqual({
      start: "2026-02-25",
      end: "2026-03-24",
    });
    expect(payCycleRange({ type: "weekly", weekday: 5 }, "2026-03-11")).toEqual({
      start: "2026-03-06",
      end: "2026-03-12",
    });
    expect(payCycleRange({ type: "none" }, "2026-03-11")).toEqual(monthRange("2026-03-11"));
  });

  it("finds the previous period", () => {
    expect(previousRange("monthly", semi, monthRange("2026-03-11"))).toEqual({
      start: "2026-02-01",
      end: "2026-02-28",
    });
  });
});

describe("budgets", () => {
  it("tracks progress, rollover and status", () => {
    expect(budgetProgress({ amount: 10000, spent: 5000, carry: 0, alertPct: 80 }).status).toBe(
      "ok",
    );
    expect(budgetProgress({ amount: 10000, spent: 8000, carry: 0, alertPct: 80 }).status).toBe(
      "warn",
    );
    const over = budgetProgress({ amount: 10000, spent: 12000, carry: 0, alertPct: 80 });
    expect(over).toMatchObject({ status: "over", remaining: -2000, pct: 120 });
    expect(budgetProgress({ amount: 10000, spent: 12000, carry: 3000, alertPct: 80 }).status).toBe(
      "warn",
    );
  });

  it("levels, suggestions and safe-to-spend", () => {
    expect([alertLevel(50, 80), alertLevel(80, 80), alertLevel(101, 80)]).toEqual([0, 1, 2]);
    expect(suggestBudgetAmount(523_456)).toBe(530_000);
    expect(safeToSpendPerDay({ remaining: 100_000, reserved: 30_000, daysLeft: 7 })).toBe(10_000);
    expect(safeToSpendPerDay({ remaining: 10_000, reserved: 30_000, daysLeft: 7 })).toBe(0);
  });
});

describe("recurring", () => {
  it("lists occurrences per schedule", () => {
    expect(occurrences({ type: "monthly", day: 31 }, "2026-01-15", "2026-03-31")).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
    expect(occurrences(semi, "2026-03-01", "2026-03-31")).toEqual(["2026-03-15", "2026-03-30"]);
    expect(occurrences({ type: "weekly", weekday: 1 }, "2026-03-01", "2026-03-15")).toEqual([
      "2026-03-02",
      "2026-03-09",
    ]);
    expect(occurrences({ type: "yearly", month: 6, day: 1 }, "2026-01-01", "2026-12-31")).toEqual([
      "2026-06-01",
    ]);
  });

  it("derives status and describes schedules", () => {
    expect(occurrenceStatus("2026-03-01", "2026-03-05", 3, undefined)).toBe("overdue");
    expect(occurrenceStatus("2026-03-07", "2026-03-05", 3, undefined)).toBe("due_soon");
    expect(occurrenceStatus("2026-03-20", "2026-03-05", 3, undefined)).toBe("upcoming");
    expect(
      occurrenceStatus("2026-03-01", "2026-03-05", 3, {
        recurringId: "r",
        dueDate: "2026-03-01",
        status: "paid",
        transactionId: null,
      }),
    ).toBe("paid");
    expect(describeSchedule({ type: "monthly", day: 22 })).toBe("Monthly on the 22nd");
    expect(describeSchedule(semi)).toBe("Every 15th and 30th");
  });
});

describe("goals", () => {
  it("computes progress and monthly amount needed", () => {
    const goal = {
      id: "g",
      userId: "u",
      name: "Laptop",
      target: 6_000_000,
      deadline: "2026-09-01",
      icon: "laptop",
      color: "#7FB3D5",
      status: "active" as const,
      completedAt: null,
    };
    const p = goalProgress(goal, 1_500_000, "2026-03-01");
    expect(p.pct).toBe(25);
    expect(p.monthlyNeeded).toBe(750_000);
    expect(goalProgress({ ...goal, deadline: null }, 0, "2026-03-01").monthlyNeeded).toBeNull();
  });
});
