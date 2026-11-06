import { describe, expect, it } from "vitest";

import { assessHealth, type HealthSignals, healthLevel } from "./health";
import { deriveMood } from "./mood";

const fine: HealthSignals = {
  hasData: true,
  budgetUsedPct: 40,
  alertPct: 80,
  overBudget: [],
  earned: 3000000,
  spent: 1000000,
  balance: 2000000,
  forecastLow: 1500000,
  overdueBills: 0,
  overdueDebts: 0,
  owed: 0,
};

describe("assessHealth", () => {
  it("is thriving when everything is on track", () => {
    const r = assessHealth(fine);
    expect(r.level).toBe("thriving");
    expect(r.score).toBe(100);
    expect(r.reasons.every((x) => x.good)).toBe(true);
  });

  it("gets thin with a few problems", () => {
    const r = assessHealth({ ...fine, budgetUsedPct: 90, overBudget: ["Food"], overdueBills: 1 });
    expect(r.score).toBe(65);
    expect(r.level).toBe("healthy");
    expect(r.reasons[0]?.text).toBe("Budget is 90% used");
    expect(assessHealth({ ...fine, budgetUsedPct: 105, overBudget: ["Food"] }).level).toBe(
      "healthy",
    );
    expect(
      assessHealth({ ...fine, budgetUsedPct: 105, overBudget: ["Food"], spent: 4000000 }).level,
    ).toBe("thin");
  });

  it("starves when broke and behind", () => {
    const r = assessHealth({
      ...fine,
      balance: -50000,
      budgetUsedPct: 130,
      overBudget: ["Food", "Shopping", "Fun"],
      spent: 5000000,
      overdueBills: 2,
      overdueDebts: 1,
    });
    expect(r.score).toBe(0);
    expect(r.level).toBe("famished");
    expect(r.reasons.length).toBeLessThanOrEqual(4);
  });

  it("stays neutral without data", () => {
    expect(assessHealth({ ...fine, hasData: false }).level).toBe("healthy");
  });

  it("maps scores to levels and moods", () => {
    expect([90, 60, 40, 10].map(healthLevel)).toEqual(["thriving", "healthy", "thin", "famished"]);
    expect(deriveMood({ hour: 12, budgetUsedPct: 10, health: "famished" })).toBe("sad");
    expect(deriveMood({ hour: 12, budgetUsedPct: 10, health: "thin" })).toBe("worried");
  });
});
