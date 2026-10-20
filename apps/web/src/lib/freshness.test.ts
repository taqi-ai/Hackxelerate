import { describe, expect, it } from "vitest";
import { freshnessLabel, stalest } from "./freshness";

describe("source freshness labels", () => {
  it("says plainly when a file has no dates, instead of inventing one", () => {
    expect(freshnessLabel({ as_of: null, basis: "placement tracker has no dates", age_days: null, stale: null })).toEqual({
      text: "No dates in file", tone: "none", title: "placement tracker has no dates",
    });
    expect(freshnessLabel(undefined).tone).toBe("none");
  });

  it("shows the date, the age and why it is stale", () => {
    const l = freshnessLabel({ as_of: "2026-10-11", basis: "latest activity week", age_days: 20, stale: true, stale_after_days: 14 });
    expect(l.text).toBe("11 Oct 2026 (20 days old)");
    expect(l.tone).toBe("stale");
    expect(l.title).toContain("14-day limit");
  });

  it("picks a stale source before an older fresh one", () => {
    const s = stalest({
      lms_activity_log: { as_of: "2026-10-01", basis: "", age_days: 19, stale: true },
      clubs_events: { as_of: "2026-08-01", basis: "", age_days: 80, stale: false },
      erp_academics: { as_of: null, basis: "", age_days: null, stale: null },
    });
    expect(s?.[0]).toBe("lms_activity_log");
    expect(stalest({})).toBeNull();
  });
});
