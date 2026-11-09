import { describe, expect, it } from "vitest";

import {
  advance,
  EMPTY_PROGRESS,
  isUnlocked,
  nextMilestone,
  pendingUnlock,
  unlockedCount,
} from "./milestones";

const peso = (n: number) => n * 100;

describe("milestones", () => {
  it("counts unlocked tiers by best balance", () => {
    expect(unlockedCount(0)).toBe(0);
    expect(unlockedCount(peso(999))).toBe(0);
    expect(unlockedCount(peso(1000))).toBe(1);
    expect(unlockedCount(peso(120_000))).toBe(6);
    expect(unlockedCount(peso(2_000_000))).toBe(8);
  });

  it("keeps the best balance and wears the newest item", () => {
    const a = advance(EMPTY_PROGRESS, peso(12_000));
    expect(a).toEqual({ best: peso(12_000), outfit: "coin", celebrated: 0 });
    const b = advance({ ...a, outfit: "sprout" }, peso(3_000));
    expect(b.best).toBe(peso(12_000));
    expect(b.outfit).toBe("sprout");
    expect(advance(b, peso(30_000)).outfit).toBe("shades");
  });

  it("celebrates only the highest new tier once", () => {
    const p = advance(EMPTY_PROGRESS, peso(60_000));
    expect(pendingUnlock(p)?.id).toBe("grad");
    expect(pendingUnlock({ ...p, celebrated: 5 })).toBeNull();
  });

  it("reports progress to the next tier from the current balance", () => {
    const p = advance(EMPTY_PROGRESS, peso(9_000));
    expect(nextMilestone(p, peso(9_000))).toMatchObject({
      milestone: { id: "coin" },
      remaining: peso(1_000),
      pct: 90,
    });
    expect(nextMilestone(advance(p, peso(1_000_000)), 0)).toBeNull();
    expect(isUnlocked(p.best, "bandana")).toBe(true);
    expect(isUnlocked(p.best, "coin")).toBe(false);
  });
});
