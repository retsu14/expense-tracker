import { describe, expect, it } from "vitest";

import { forecastCashflow, heatLevel, insightRange, kpis, percentChange } from "./insights";

describe("insightRange", () => {
  it("builds current and previous ranges with elapsed days", () => {
    expect(insightRange("month", "2026-03-10")).toEqual({
      start: "2026-03-01",
      end: "2026-03-31",
      prevStart: "2026-02-01",
      prevEnd: "2026-02-28",
      elapsedDays: 10,
      totalDays: 31,
    });
    expect(insightRange("last-month", "2026-03-10")).toMatchObject({
      start: "2026-02-01",
      end: "2026-02-28",
      elapsedDays: 28,
    });
    expect(insightRange("3m", "2026-03-10")).toMatchObject({
      start: "2026-01-01",
      prevStart: "2025-10-01",
    });
    expect(insightRange("year", "2026-03-10")).toMatchObject({
      prevStart: "2025-01-01",
      totalDays: 365,
    });
  });
});

describe("kpis", () => {
  const range = insightRange("month", "2026-03-10");

  it("computes net, savings rate, pace forecast and deltas", () => {
    const k = kpis(
      { expense: 10_000, income: 40_000, count: 5 },
      { expense: 20_000, income: 40_000, count: 9 },
      range,
    );
    expect(k).toMatchObject({ net: 30_000, savingsRate: 75, avgPerDay: 1_000, forecast: 31_000 });
    expect(k.deltas.spent).toBe(-50);
  });

  it("handles empty previous periods", () => {
    expect(percentChange(100, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
    expect(
      kpis({ expense: 0, income: 0, count: 0 }, { expense: 0, income: 0, count: 0 }, range)
        .savingsRate,
    ).toBeNull();
  });
});

describe("forecastCashflow", () => {
  it("applies daily spend and scheduled events, tracking the low point", () => {
    const f = forecastCashflow({
      balance: 10_000,
      today: "2026-03-10",
      until: "2026-03-15",
      avgDailySpend: 1_000,
      events: [
        { date: "2026-03-12", amount: -9_000, label: "Rent" },
        { date: "2026-03-15", amount: 20_000, label: "Salary" },
        { date: "2026-03-01", amount: -500, label: "Overdue bill" },
      ],
    });
    expect(f.points.map((p) => p.balance)).toEqual([9_500, 8_500, -1_500, -2_500, -3_500, 15_500]);
    expect(f.low).toEqual({ date: "2026-03-14", balance: -3_500 });
    expect(f.end).toBe(15_500);
  });
});

describe("heatLevel", () => {
  it("buckets values relative to the max", () => {
    expect([0, 10, 30, 50, 70, 100].map((v) => heatLevel(v, 100))).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
