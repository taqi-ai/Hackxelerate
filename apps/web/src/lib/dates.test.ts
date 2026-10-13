import { describe, expect, it } from "vitest";
import { campusDate, istParts } from "./dates";

describe("campus dates (IST)", () => {
  it("uses the IST day just after midnight IST (still the previous day in UTC)", () => {
    const now = new Date("2026-10-13T19:10:00Z"); // 00:40 IST on 14 Oct
    expect(campusDate(0, now)).toBe("2026-10-14");
    expect(istParts(now).hour).toBe(0);
  });
  it("shifts by whole days across month ends", () => {
    expect(campusDate(14, new Date("2026-10-25T10:00:00Z"))).toBe("2026-11-08");
    expect(campusDate(-1, new Date("2026-03-01T03:00:00Z"))).toBe("2026-02-28");
  });
  it("does not roll over before 18:30 UTC", () => {
    expect(campusDate(0, new Date("2026-10-14T18:29:00Z"))).toBe("2026-10-14");
    expect(campusDate(0, new Date("2026-10-14T18:30:00Z"))).toBe("2026-10-15");
  });
});
