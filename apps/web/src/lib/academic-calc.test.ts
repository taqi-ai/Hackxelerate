import { describe, it, expect } from "vitest";
import {
  calculateAttendance,
  calculateSubjectMarkTarget,
  calculateSGPA,
  calculateCGPAScenario,
  getGradePointFromTotal,
} from "./academic-calc";

describe("Attendance Calculation Engine (Section 7 & 15.C)", () => {
  it("handles zero classes conducted without division by zero", () => {
    const res = calculateAttendance({ attended: 0, conducted: 0, requiredPct: 75 });
    expect(res.conducted).toBe(0);
    expect(res.currentPct).toBe(0);
    expect(res.classesNeededForRequired).toBe(0);
    expect(res.allowedAbsencesAtTarget).toBe(0);
    expect(res.status).toBe("safe");
  });

  it("handles 100% full attendance correctly", () => {
    // 40 attended out of 40 conducted
    const res = calculateAttendance({ attended: 40, conducted: 40, requiredPct: 75, safeZonePct: 80 });
    expect(res.currentPct).toBe(100);
    expect(res.status).toBe("surplus");
    expect(res.classesNeededForRequired).toBe(0);
    expect(res.classesNeededForSafeZone).toBe(0);
    // At 75%: floor(40 / 0.75 - 40) = floor(53.33 - 40) = 13 classes
    expect(res.allowedAbsencesAtTarget).toBe(13);
  });

  it("handles attendance exactly at the threshold", () => {
    // 30 attended out of 40 conducted = 75.0%
    const res = calculateAttendance({ attended: 30, conducted: 40, requiredPct: 75 });
    expect(res.currentPct).toBe(75);
    expect(res.classesNeededForRequired).toBe(0);
    // Cannot miss any without dropping below 75%
    expect(res.allowedAbsencesAtTarget).toBe(0);
  });

  it("handles attendance below threshold and computes required consecutive recovery classes", () => {
    // 20 attended out of 40 conducted = 50.0%
    // Formula: ceil((0.75 * 40 - 20) / (1 - 0.75)) = ceil((30 - 20) / 0.25) = ceil(10 / 0.25) = 40 classes
    // Verification: (20 + 40) / (40 + 40) = 60 / 80 = 75.0%
    const res = calculateAttendance({ attended: 20, conducted: 40, requiredPct: 75 });
    expect(res.currentPct).toBe(50);
    expect(res.status).toBe("critically_low");
    expect(res.classesNeededForRequired).toBe(40);
    expect(res.allowedAbsencesAtTarget).toBe(0);
  });

  it("handles small deficit requiring just a few classes", () => {
    // 29 attended out of 40 conducted = 72.5%
    // ceil((0.75 * 40 - 29) / 0.25) = ceil((30 - 29) / 0.25) = ceil(1 / 0.25) = 4 classes
    // Verification: (29 + 4) / (40 + 4) = 33 / 44 = 75.0%
    const res = calculateAttendance({ attended: 29, conducted: 40, requiredPct: 75 });
    expect(res.currentPct).toBe(72.5);
    expect(res.classesNeededForRequired).toBe(4);
  });

  it("computes safe-zone recovery correctly (80% and 85%)", () => {
    // 29 attended out of 40 conducted
    // Safe zone 80%: ceil((0.80 * 40 - 29) / 0.20) = ceil((32 - 29) / 0.20) = ceil(3 / 0.20) = 15 classes
    // Verification: (29 + 15) / (40 + 15) = 44 / 55 = 80.0%
    const res = calculateAttendance({ attended: 29, conducted: 40, requiredPct: 75, safeZonePct: 80 });
    expect(res.classesNeededForSafeZone).toBe(15);
  });

  it("handles projected attendance with both future attended and missed classes", () => {
    // Current: 35/40 = 87.5%
    // Future attended: 5, future missed: 5
    // Projected: (35 + 5) / (40 + 5 + 5) = 40 / 50 = 80.0%
    const res = calculateAttendance({
      attended: 35,
      conducted: 40,
      requiredPct: 75,
      futureAttended: 5,
      futureMissed: 5,
    });
    expect(res.projectedPct).toBe(80);
    // After attending 5 more classes, total attended is 40 out of 45.
    // Safe missed: floor(40 / 0.75 - 45) = floor(53.33 - 45) = 8 classes
    expect(res.allowedAbsencesAtTarget).toBe(8);
  });

  it("sanitizes bounds and handles invalid input gracefully", () => {
    // Attended > conducted
    const res = calculateAttendance({ attended: 50, conducted: 40, requiredPct: 75 });
    expect(res.attended).toBe(40);
    expect(res.currentPct).toBe(100);
  });
});

describe("Marks, Assessment, SGPA & CGPA Engine (Section 8 & 15.D)", () => {
  it("determines correct grade band and points", () => {
    expect(getGradePointFromTotal(95)).toEqual({ grade: "A+", point: 10, label: "Outstanding" });
    expect(getGradePointFromTotal(82)).toEqual({ grade: "A", point: 9, label: "Excellent" });
    expect(getGradePointFromTotal(74)).toEqual({ grade: "B+", point: 8, label: "Very Good" });
    expect(getGradePointFromTotal(65)).toEqual({ grade: "B", point: 7, label: "Good" });
    expect(getGradePointFromTotal(52)).toEqual({ grade: "C", point: 6, label: "Average" });
    expect(getGradePointFromTotal(41)).toEqual({ grade: "P", point: 4, label: "Pass" });
    expect(getGradePointFromTotal(35)).toEqual({ grade: "F", point: 0, label: "Fail" });
  });

  it("calculates required end-sem score for achievable target", () => {
    // Internal: 24/40, End-sem max: 60, Target: 60 (Grade B)
    // Required end-sem: 60 - 24 = 36 out of 60
    const res = calculateSubjectMarkTarget({
      subject: "Data Structures",
      internalScore: 24,
      internalMax: 40,
      endSemMax: 60,
      targetTotal: 60,
    });
    expect(res.isAchievable).toBe(true);
    expect(res.requiredEndSemScore).toBe(36);
    expect(res.gradeBand).toBe("B");
    expect(res.projectedGradePoint).toBe(7);
  });

  it("flags mathematically unreachable targets when required marks exceed maximum", () => {
    // Internal: 15/40, End-sem max: 60, Target: 80 (Grade A)
    // Required end-sem: 80 - 15 = 65 out of 60 -> unreachable!
    const res = calculateSubjectMarkTarget({
      subject: "Deep Learning",
      internalScore: 15,
      internalMax: 40,
      endSemMax: 60,
      targetTotal: 80,
    });
    expect(res.isAchievable).toBe(false);
    expect(res.requiredEndSemScore).toBe(65);
  });

  it("calculates credit-weighted SGPA correctly", () => {
    // Subject 1: 4 credits, Grade Point 9 (A) -> 36
    // Subject 2: 4 credits, Grade Point 8 (B+) -> 32
    // Subject 3: 3 credits, Grade Point 7 (B) -> 21
    // Subject 4: 3 credits, Grade Point 10 (A+) -> 30
    // Total credits: 14, weighted sum: 119 -> SGPA: 119 / 14 = 8.50
    const sgpa = calculateSGPA([
      { credits: 4, gradePoint: 9 },
      { credits: 4, gradePoint: 8 },
      { credits: 3, gradePoint: 7 },
      { credits: 3, gradePoint: 10 },
    ]);
    expect(sgpa).toBe(8.5);
  });

  it("calculates CGPA target scenario and achievable required SGPA", () => {
    // Current CGPA: 7.20 across 80 completed credits
    // Current semester credits: 20 (Total credits: 100)
    // Target CGPA: 7.50
    // Required SGPA: (7.50 * 100 - 7.20 * 80) / 20 = (750 - 576) / 20 = 174 / 20 = 8.70
    const scenario = calculateCGPAScenario({
      currentCGPA: 7.2,
      completedCredits: 80,
      currentSemesterCredits: 20,
      targetCGPA: 7.5,
    });
    expect(scenario.isAchievable).toBe(true);
    expect(scenario.requiredSGPA).toBe(8.7);
  });

  it("flags unreachable CGPA target in a single semester when required SGPA > 10.0", () => {
    // Current CGPA: 6.0 across 80 completed credits
    // Current semester credits: 20 (Total credits: 100)
    // Target CGPA: 8.00
    // Required SGPA: (8.00 * 100 - 6.0 * 80) / 20 = (800 - 480) / 20 = 320 / 20 = 16.0 -> unreachable!
    const scenario = calculateCGPAScenario({
      currentCGPA: 6.0,
      completedCredits: 80,
      currentSemesterCredits: 20,
      targetCGPA: 8.0,
    });
    expect(scenario.isAchievable).toBe(false);
    expect(scenario.requiredSGPA).toBe(16.0);
  });
});
