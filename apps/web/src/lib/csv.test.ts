import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "./csv";

describe("CSV export cells", () => {
  it("neutralises spreadsheet formulas in text", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe(`"'=HYPERLINK(""http://x"")"`);
    expect(csvCell("+1+1")).toBe(`"'+1+1"`);
    expect(csvCell("-2+3")).toBe(`"'-2+3"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("\tcmd")).toBe(`"'\tcmd"`);
  });
  it("keeps ordinary values and real numbers unchanged", () => {
    expect(csvCell("Asha Verma")).toBe(`"Asha Verma"`);
    expect(csvCell(-0.25)).toBe(`"-0.25"`);
    expect(csvCell(73)).toBe(`"73"`);
    expect(csvCell(null)).toBe(`""`);
  });
  it("joins a row", () => {
    expect(csvRow(["CU25CSE0001", 61.2, "=1"])).toBe(`"CU25CSE0001","61.2","'=1"`);
  });
});
