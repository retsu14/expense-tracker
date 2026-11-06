import { describe, expect, it } from "vitest";

import { csvCell, csvRow } from "./csv";

describe("csv", () => {
  it("quotes special characters and neutralizes formulas", () => {
    expect(csvCell('Say "hi", ok')).toBe('"Say ""hi"", ok"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(-150)).toBe("-150");
    expect(csvRow(["a", null, 2])).toBe("a,,2");
  });
});

describe("csv numbers", () => {
  it("keeps negative numbers numeric", () => {
    expect(csvRow([-24.5, 1200])).toBe("-24.5,1200");
  });
});
