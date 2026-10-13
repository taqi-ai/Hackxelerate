import type {
  AttendanceCalculation,
  SubjectMarkScenario,
  CGPAScenario,
} from "./types";

/**
 * Standard university grading bands and associated grade points.
 */
export const GRADE_BANDS = [
  { grade: "A+", min: 90, point: 10, label: "Outstanding" },
  { grade: "A", min: 80, point: 9, label: "Excellent" },
  { grade: "B+", min: 70, point: 8, label: "Very Good" },
  { grade: "B", min: 60, point: 7, label: "Good" },
  { grade: "C", min: 50, point: 6, label: "Average" },
  { grade: "P", min: 40, point: 4, label: "Pass" },
  { grade: "F", min: 0, point: 0, label: "Fail" },
] as const;

export function getGradePointFromTotal(total: number): { grade: string; point: number; label: string } {
  for (const b of GRADE_BANDS) {
    if (total >= b.min) {
      return { grade: b.grade, point: b.point, label: b.label };
    }
  }
  return { grade: "F", point: 0, label: "Fail" };
}

/**
 * Attendance calculation engine implementing verified attendance math:
 * A = attended, T = conducted, p = required threshold fraction (e.g. 0.75),
 * x = future classes attended, y = future classes missed.
 */
export function calculateAttendance(params: {
  attended: number;
  conducted: number;
  requiredPct?: number; // default 75%
  safeZonePct?: number; // default 80%
  futureAttended?: number; // x
  futureMissed?: number; // y
}): AttendanceCalculation {
  const {
    attended: rawA,
    conducted: rawT,
    requiredPct = 75,
    safeZonePct = 80,
    futureAttended = 0,
    futureMissed = 0,
  } = params;

  const T = Math.max(0, Math.round(rawT));
  const A = Math.min(T, Math.max(0, Math.round(rawA)));
  const x = Math.max(0, Math.round(futureAttended));
  const y = Math.max(0, Math.round(futureMissed));

  const p = Math.max(0.01, Math.min(0.99, requiredPct / 100));
  const pSafe = Math.max(p, Math.min(0.99, safeZonePct / 100));

  if (T === 0) {
    return {
      attended: 0,
      conducted: 0,
      currentPct: 0,
      requiredPct,
      safeZonePct,
      status: "safe",
      classesNeededForRequired: 0,
      classesNeededForSafeZone: 0,
      allowedAbsencesAtTarget: 0,
      allowedAbsencesAtSafeZone: 0,
      projectedPct: 0,
      message: "No classes conducted yet.",
      safeMessage: "Course schedule not started.",
      absenceMessage: "Buffer available: 0 classes.",
    };
  }

  const currentPct = Number(((A / T) * 100).toFixed(1));
  const projectedDenom = T + x + y;
  const projectedPct = projectedDenom > 0 ? Number((((A + x) / projectedDenom) * 100).toFixed(1)) : currentPct;

  // Numerical precision epsilon to avoid floating point ceiling artifacts
  const eps = 1e-9;

  // Consecutive classes needed to reach threshold assuming every next class is attended:
  // ceil((p * T - A) / (1 - p))
  const neededRaw = (p * T - A) / (1 - p);
  const classesNeededForRequired = neededRaw > 0 ? Math.ceil(neededRaw - eps) : 0;

  // Classes needed for safe zone:
  const neededSafeRaw = (pSafe * T - A) / (1 - pSafe);
  const classesNeededForSafeZone = neededSafeRaw > 0 ? Math.ceil(neededSafeRaw - eps) : 0;

  // Safe number of additional classes that can be missed while remaining >= threshold:
  // floor((A + x) / p - (T + x))
  const allowedAtTargetRaw = (A + x) / p - (T + x);
  const allowedAbsencesAtTarget = allowedAtTargetRaw > 0 ? Math.floor(allowedAtTargetRaw + eps) : 0;

  const allowedAtSafeRaw = (A + x) / pSafe - (T + x);
  const allowedAbsencesAtSafeZone = allowedAtSafeRaw > 0 ? Math.floor(allowedAtSafeRaw + eps) : 0;

  let status: AttendanceCalculation["status"] = "safe";
  let message = "";
  let safeMessage = "";
  let absenceMessage = "";

  if (currentPct < requiredPct) {
    status = currentPct < requiredPct - 10 ? "critically_low" : "below_target";
    message = `Attend ${classesNeededForRequired} more consecutive ${classesNeededForRequired === 1 ? "class" : "classes"} to reach the ${requiredPct}% threshold.`;
  } else {
    status = currentPct >= safeZonePct ? "surplus" : "safe";
    message = `Attendance is currently on track at ${currentPct}%.`;
  }

  if (classesNeededForSafeZone > 0) {
    safeMessage = `Attend ${classesNeededForSafeZone} ${classesNeededForSafeZone === 1 ? "class" : "classes"} to reach your ${safeZonePct}% safe zone.`;
  } else {
    safeMessage = `Safe zone target (${safeZonePct}%) secured.`;
  }

  if (allowedAbsencesAtTarget > 0) {
    absenceMessage = `You can miss up to ${allowedAbsencesAtTarget} future ${allowedAbsencesAtTarget === 1 ? "class" : "classes"} and maintain ${requiredPct}%.`;
  } else {
    absenceMessage = "No missed classes permitted without dropping below the threshold.";
  }

  return {
    attended: A,
    conducted: T,
    currentPct,
    requiredPct,
    safeZonePct,
    status,
    classesNeededForRequired,
    classesNeededForSafeZone,
    allowedAbsencesAtTarget,
    allowedAbsencesAtSafeZone,
    projectedPct,
    message,
    safeMessage,
    absenceMessage,
  };
}

/**
 * Subject mark target planner.
 * Calculates needed scores in remaining exams (MSTs or End-Sem) given internal assessments.
 */
export function calculateSubjectMarkTarget(params: {
  subject: string;
  credits?: number;
  internalScore: number;
  internalMax?: number; // default 40
  endSemScore?: number | null;
  endSemMax?: number; // default 60
  targetTotal?: number; // default 60 (Grade B)
}): SubjectMarkScenario {
  const {
    subject,
    credits = 4,
    internalScore,
    internalMax = 40,
    endSemScore = null,
    endSemMax = 60,
    targetTotal = 60,
  } = params;

  const boundedInternal = Math.min(internalMax, Math.max(0, Number(internalScore) || 0));
  const currentTotal = endSemScore !== null && endSemScore !== undefined
    ? Number((boundedInternal + Math.min(endSemMax, Math.max(0, Number(endSemScore)))).toFixed(1))
    : Number(boundedInternal.toFixed(1));

  let requiredEndSemScore: number | null = null;
  let isAchievable = true;

  if (endSemScore === null || endSemScore === undefined) {
    const rawRequired = targetTotal - boundedInternal;
    if (rawRequired <= 0) {
      requiredEndSemScore = 0;
      isAchievable = true;
    } else if (rawRequired > endSemMax) {
      requiredEndSemScore = Number(rawRequired.toFixed(1));
      isAchievable = false;
    } else {
      requiredEndSemScore = Number(rawRequired.toFixed(1));
      isAchievable = true;
    }
  }

  const { grade, point } = getGradePointFromTotal(endSemScore !== null ? currentTotal : targetTotal);

  return {
    subject,
    credits,
    internalScore: boundedInternal,
    internalMax,
    endSemScore,
    endSemMax,
    currentTotal,
    targetTotal,
    requiredEndSemScore,
    isAchievable,
    gradeBand: grade,
    projectedGradePoint: point,
  };
}

/**
 * Credit-weighted SGPA calculation:
 * SGPA = sum(credits * grade_point) / sum(credits)
 */
export function calculateSGPA(subjects: { credits: number; gradePoint: number }[]): number {
  const totalCredits = subjects.reduce((acc, s) => acc + Math.max(0, s.credits), 0);
  if (totalCredits === 0) return 0;
  const weightedSum = subjects.reduce((acc, s) => acc + Math.max(0, s.credits) * Math.max(0, s.gradePoint), 0);
  return Number((weightedSum / totalCredits).toFixed(2));
}

/**
 * Cumulative CGPA Projection and Target Planner:
 * CGPA_new = (completedCredits * currentCGPA + semCredits * SGPA) / (completedCredits + semCredits)
 * Required SGPA = (targetCGPA * totalCredits - completedCredits * currentCGPA) / semCredits
 */
export function calculateCGPAScenario(params: {
  currentCGPA: number;
  completedCredits: number;
  currentSemesterCredits: number;
  targetCGPA: number;
  semesterSubjects?: { subject: string; credits: number; targetGradePoint: number }[];
}): CGPAScenario {
  const {
    currentCGPA,
    completedCredits,
    currentSemesterCredits,
    targetCGPA,
    semesterSubjects = [],
  } = params;

  const totalCredits = completedCredits + currentSemesterCredits;
  if (currentSemesterCredits === 0) {
    return {
      currentCGPA,
      completedCredits,
      currentSemesterCredits: 0,
      targetCGPA,
      requiredSGPA: currentCGPA,
      isAchievable: targetCGPA <= currentCGPA,
      projectedCGPA: currentCGPA,
      semesterSubjects: [],
    };
  }

  // Required SGPA to hit target CGPA
  const rawRequiredSGPA =
    (targetCGPA * totalCredits - completedCredits * currentCGPA) / currentSemesterCredits;

  const requiredSGPA = Number(rawRequiredSGPA.toFixed(2));
  const isAchievable = requiredSGPA >= 0 && requiredSGPA <= 10.0;

  // If semester subjects are provided, compute projected SGPA and overall CGPA
  let projectedSGPA = 0;
  if (semesterSubjects.length > 0) {
    projectedSGPA = calculateSGPA(
      semesterSubjects.map((s) => ({ credits: s.credits, gradePoint: s.targetGradePoint }))
    );
  } else {
    projectedSGPA = Math.min(10.0, Math.max(0, requiredSGPA));
  }

  const projectedCGPA = Number(
    ((completedCredits * currentCGPA + currentSemesterCredits * projectedSGPA) / totalCredits).toFixed(2)
  );

  return {
    currentCGPA,
    completedCredits,
    currentSemesterCredits,
    targetCGPA,
    requiredSGPA,
    isAchievable,
    projectedCGPA,
    semesterSubjects,
  };
}
