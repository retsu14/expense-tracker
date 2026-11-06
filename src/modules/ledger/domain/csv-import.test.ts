import { describe, expect, it } from "vitest";

import { guessMapping, mapRows, parseAmount, parseCsv, parseDate } from "./csv-import";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, BOM, CRLF and semicolons", () => {
    expect(
      parseCsv(
        '﻿Date,Note,Amount\r\n2026-03-01,"Lunch, Jollibee",-150\r\n2026-03-02,"Say ""hi""",200\n',
      ),
    ).toEqual([
      ["Date", "Note", "Amount"],
      ["2026-03-01", "Lunch, Jollibee", "-150"],
      ["2026-03-02", 'Say "hi"', "200"],
    ]);
    expect(parseCsv("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("parseDate / parseAmount", () => {
  it("reads common date formats", () => {
    expect(parseDate("2026-03-05", "dmy")).toBe("2026-03-05");
    expect(parseDate("03/05/2026", "mdy")).toBe("2026-03-05");
    expect(parseDate("05/03/2026 10:30", "dmy")).toBe("2026-03-05");
    expect(parseDate("5.3.26", "dmy")).toBe("2026-03-05");
    expect(parseDate("31/02/2026", "dmy")).toBeNull();
  });

  it("reads peso amounts and negatives", () => {
    expect(parseAmount("₱1,234.50")).toBe(123450);
    expect(parseAmount("-150")).toBe(-15000);
    expect(parseAmount("(99.90)")).toBe(-9990);
    expect(parseAmount("PHP 20")).toBe(2000);
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("mapRows", () => {
  const rows = [
    ["Date", "Description", "Amount", "Category"],
    ["2026-03-01", "Grab", "-180", "Transport"],
    ["2026-03-01", "Grab", "-180", "Transport"],
    ["2026-03-02", "Salary", "15000", "Salary"],
    ["bad", "x", "1", ""],
  ];
  const mapping = {
    date: 0,
    amount: 2,
    note: 1,
    category: 3,
    dateFormat: "ymd" as const,
    sign: "negative_is_expense" as const,
  };

  it("maps rows, signs and errors with stable distinct keys", () => {
    const { parsed, errors } = mapRows(rows, mapping, true);
    expect(parsed.map((p) => [p.kind, p.amount, p.category])).toEqual([
      ["expense", 18000, "Transport"],
      ["expense", 18000, "Transport"],
      ["income", 1500000, "Salary"],
    ]);
    expect(parsed[0]?.key).not.toBe(parsed[1]?.key);
    expect(mapRows(rows, mapping, true).parsed[0]?.key).toBe(parsed[0]?.key);
    expect(errors).toEqual([{ line: 5, message: 'Can\'t read the date "bad".' }]);
  });

  it("guesses columns from headers", () => {
    expect(guessMapping(["Posted Date", "Particulars", "Amount (PHP)"])).toMatchObject({
      date: 0,
      note: 1,
      amount: 2,
    });
  });
});
