import { describe, expect, it } from "vitest";

import { deriveMood } from "./mood";

const base = { hour: 12, budgetUsedPct: 40 };

describe("deriveMood", () => {
  it("is happy under budget during the day", () => {
    expect(deriveMood(base)).toBe("happy");
    expect(deriveMood({ ...base, budgetUsedPct: null })).toBe("happy");
  });

  it("worries at the alert threshold and is sad when over", () => {
    expect(deriveMood({ ...base, budgetUsedPct: 80 })).toBe("worried");
    expect(deriveMood({ ...base, budgetUsedPct: 70, alertPct: 70 })).toBe("worried");
    expect(deriveMood({ ...base, budgetUsedPct: 100.5 })).toBe("sad");
  });

  it("sleeps late at night or when idle", () => {
    expect(deriveMood({ ...base, hour: 23 })).toBe("sleeping");
    expect(deriveMood({ ...base, hour: 3 })).toBe("sleeping");
    expect(deriveMood({ ...base, hour: 5 })).toBe("happy");
    expect(deriveMood({ ...base, idleMinutes: 45 })).toBe("sleeping");
  });

  it("prioritises events over budget state", () => {
    expect(deriveMood({ ...base, budgetUsedPct: 120, milestoneReached: true })).toBe("celebrating");
    expect(deriveMood({ ...base, budgetUsedPct: 120, justSaved: true })).toBe("munch");
  });

  it("budget trouble wakes the pig up", () => {
    expect(deriveMood({ ...base, hour: 2, budgetUsedPct: 110 })).toBe("sad");
  });
});
