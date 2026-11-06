import { describe, expect, it } from "vitest";

import { Money } from "./money";

const p = (input: string) => {
  const money = Money.parse(input);
  if (!money) throw new Error(`Unparseable: ${input}`);
  return money;
};

describe("Money", () => {
  it("parses peso strings into centavos", () => {
    expect(Money.parse("₱1,234.5")?.centavos).toBe(123450n);
    expect(Money.parse("150")?.centavos).toBe(15000n);
    expect(Money.parse("-0.05")?.centavos).toBe(-5n);
    expect(Money.parse("1.234")).toBeNull();
    expect(Money.parse("abc")).toBeNull();
  });

  it("adds and subtracts without float drift", () => {
    const total = p("0.1").add(p("0.2"));
    expect(total.equals(p("0.3"))).toBe(true);
    expect(Money.of(500).subtract(Money.of(800)).isNegative()).toBe(true);
  });

  it("computes percent of total", () => {
    expect(Money.of(8000).percentOf(Money.of(10000))).toBe(80);
    expect(Money.of(1).percentOf(Money.zero())).toBe(0);
  });

  it("rejects non-integer centavos", () => {
    expect(() => Money.of(1.5)).toThrow(RangeError);
  });

  it("formats as PHP", () => {
    expect(Money.of(123450).format()).toBe("₱1,234.50");
  });
});
