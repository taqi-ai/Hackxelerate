import { describe, expect, it } from "vitest";

interface Baseline {
  success_score: number;
  academic_risk_prob: number;
  placement_risk_prob: number | null;
}

interface Followup {
  date: string;
  academic_risk_prob?: number | null;
  success_score?: number | null;
  attendance_pct?: number | null;
}

/** Pure helper to calculate observed intervention change */
function computeInterventionChange(baseline: Baseline | null, followup: Followup | null) {
  if (!baseline || !followup || followup.academic_risk_prob === null || followup.academic_risk_prob === undefined) {
    return { deltaRisk: null, pctChange: null, hasImproved: false };
  }

  const deltaRisk = Math.round((followup.academic_risk_prob - baseline.academic_risk_prob) * 1000) / 1000;
  const pctChange =
    baseline.academic_risk_prob > 0
      ? Math.round((deltaRisk / baseline.academic_risk_prob) * 100)
      : 0;

  // Academic risk decrease is beneficial
  const hasImproved = deltaRisk < -0.01;

  return {
    deltaRisk,
    pctChange,
    hasImproved,
  };
}

describe("intervention-effectiveness", () => {
  it("calculates favorable risk reduction from baseline to follow-up", () => {
    const baseline: Baseline = { success_score: 52, academic_risk_prob: 0.65, placement_risk_prob: null };
    const followup: Followup = { date: "2026-10-15", academic_risk_prob: 0.35, success_score: 68 };

    const result = computeInterventionChange(baseline, followup);
    expect(result.deltaRisk).toBe(-0.3); // Down 30 percentage points
    expect(result.pctChange).toBe(-46); // ~46% decrease in risk
    expect(result.hasImproved).toBe(true);
  });

  it("identifies unfavorable risk increase", () => {
    const baseline: Baseline = { success_score: 70, academic_risk_prob: 0.2, placement_risk_prob: null };
    const followup: Followup = { date: "2026-10-15", academic_risk_prob: 0.45, success_score: 55 };

    const result = computeInterventionChange(baseline, followup);
    expect(result.deltaRisk).toBe(0.25); // Up 25 percentage points
    expect(result.hasImproved).toBe(false);
  });

  it("handles missing follow-up data without treating it as improvement", () => {
    const baseline: Baseline = { success_score: 60, academic_risk_prob: 0.4, placement_risk_prob: null };
    const followup: Followup = { date: "2026-10-15", academic_risk_prob: null };

    const result = computeInterventionChange(baseline, followup);
    expect(result.deltaRisk).toBeNull();
    expect(result.hasImproved).toBe(false);
  });

  it("handles missing baseline data gracefully", () => {
    const followup: Followup = { date: "2026-10-15", academic_risk_prob: 0.25 };

    const result = computeInterventionChange(null, followup);
    expect(result.deltaRisk).toBeNull();
    expect(result.hasImproved).toBe(false);
  });
});
