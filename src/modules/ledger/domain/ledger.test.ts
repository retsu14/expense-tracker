import { describe, expect, it } from "vitest";

import { offsetMinutes, toYmd, zonedStart } from "@/shared/kernel/time";

import { evaluateAmount, isExpression } from "./amount-expression";
import { extractTags, validateDraft } from "./transaction";
import {
  decodeCursor,
  encodeCursor,
  parseSearch,
  periodRange,
  resolveFilter,
  EMPTY_FILTER,
} from "./transaction-query";

const TZ = "Asia/Manila";

describe("evaluateAmount", () => {
  it("evaluates math into centavos", () => {
    expect(evaluateAmount("150")).toBe(15000);
    expect(evaluateAmount("150+75")).toBe(22500);
    expect(evaluateAmount("₱1,200.50")).toBe(120050);
    expect(evaluateAmount("(120+30)*2")).toBe(30000);
    expect(evaluateAmount("100/3")).toBe(3333);
    expect(evaluateAmount("13 x 4")).toBe(5200);
  });

  it("rejects invalid, zero and negative results", () => {
    expect(evaluateAmount("")).toBeNull();
    expect(evaluateAmount("abc")).toBeNull();
    expect(evaluateAmount("5-10")).toBeNull();
    expect(evaluateAmount("10/0")).toBeNull();
    expect(evaluateAmount("1..2")).toBeNull();
    expect(evaluateAmount("(1+2")).toBeNull();
    expect(evaluateAmount("alert(1)")).toBeNull();
  });

  it("detects expressions", () => {
    expect(isExpression("150+75")).toBe(true);
    expect(isExpression("150")).toBe(false);
  });
});

describe("transactions", () => {
  const base = { amount: 1000, accountId: "a", toAccountId: null, fee: 0 };
  const food = { id: "c", kind: "expense" as const, archived: false };

  it("requires a matching category for expenses and income", () => {
    expect(validateDraft({ ...base, kind: "expense", category: food }).ok).toBe(true);
    expect(validateDraft({ ...base, kind: "income", category: food }).ok).toBe(false);
    expect(validateDraft({ ...base, kind: "expense", category: null }).ok).toBe(false);
  });

  it("requires two different wallets for transfers", () => {
    expect(validateDraft({ ...base, kind: "transfer", category: null, toAccountId: "a" }).ok).toBe(
      false,
    );
    const ok = validateDraft({ ...base, kind: "transfer", category: food, toAccountId: "b" });
    expect(ok.ok && ok.value.category).toBeNull();
  });

  it("extracts hashtags", () => {
    expect(extractTags("Grab to work #commute #Work #commute")).toEqual(["commute", "work"]);
  });
});

describe("time zones", () => {
  it("computes Manila offsets and day starts", () => {
    expect(offsetMinutes(new Date("2026-03-01T00:00:00Z"), TZ)).toBe(480);
    expect(zonedStart("2026-03-01", TZ).toISOString()).toBe("2026-02-28T16:00:00.000Z");
    expect(toYmd(new Date("2026-02-28T16:30:00Z"), TZ)).toBe("2026-03-01");
  });
});

describe("transaction query", () => {
  const now = new Date("2026-03-15T04:00:00Z");

  it("parses amount operators and tags out of search", () => {
    expect(parseSearch("grab >500 #work")).toEqual({
      text: "grab",
      tags: ["work"],
      min: 50001,
      max: null,
      exact: null,
    });
    expect(parseSearch("150").exact).toBe(15000);
    expect(parseSearch("<=1,000").max).toBe(100000);
  });

  it("resolves period presets in the user's time zone", () => {
    expect(periodRange("month", now, TZ)).toEqual({ from: "2026-03-01", to: "2026-03-31" });
    expect(periodRange("last-month", now, TZ)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("7d", now, TZ)).toEqual({ from: "2026-03-09", to: "2026-03-15" });

    const r = resolveFilter({ ...EMPTY_FILTER, period: "today" }, now, TZ);
    expect(r.from?.toISOString()).toBe("2026-03-14T16:00:00.000Z");
    expect(r.to?.toISOString()).toBe("2026-03-15T16:00:00.000Z");
  });

  it("round-trips cursors and rejects garbage", () => {
    const c = {
      occurredAt: new Date("2026-03-01T10:00:00Z"),
      id: "0190a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b",
    };
    expect(decodeCursor(encodeCursor(c))).toEqual(c);
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(decodeCursor(btoa(JSON.stringify(["x", "y"])))).toBeNull();
  });
});
