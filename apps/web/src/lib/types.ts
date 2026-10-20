export type RiskLevel = "Low" | "Medium" | "High";
export type PlacementLevel = RiskLevel | "N/A";
export type Role = "admin" | "mentor" | "student";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  mentor_id: string | null;
  student_id?: string | null;
  email?: string | null;
  /** the institution the account belongs to (the evaluation campus offline) */
  institution_id?: string | null;
}

export interface Driver {
  feature: string;
  label: string;
  value: number | null;
  value_text: string;
  median_text: string;
  impact: number;
  direction: "raises" | "lowers";
  actionable: boolean;
  text: string;
}
export interface Drivers {
  raises: Driver[];
  lowers: Driver[];
}
export interface Alert {
  type: string;
  severity: "high" | "medium";
  text: string;
}
export interface Recourse {
  kind: "academic" | "placement";
  from_prob: number;
  to_prob: number;
  reaches_target: boolean;
  steps: string[];
  target: number;
}
export interface Readiness {
  intent: string;
  score: number | null;
  parts: Record<string, number | null>;
  gaps: string[];
}
export type Components = Record<"academic" | "placement" | "attendance" | "lms" | "skills" | "engagement", number>;

export interface Metrics {
  cgpa: number | null;
  backlogs: number | null;
  att_overall: number | null;
  att_core: number | null;
  completion_rate: number | null;
  login_freq: number | null;
  mocks: number | null;
  aptitude: number | null;
  coding: number | null;
  soft_avg: number | null;
  tech_avg: number | null;
}

export interface StudentScore {
  student_id: string;
  success_score: number;
  components: Components;
  academic_risk_prob: number;
  academic_risk_level: RiskLevel;
  placement_risk_prob: number | null;
  placement_risk_level: PlacementLevel;
  intent: string;
  segment_id: number;
  persona: string;
  shap_academic: Drivers | null;
  shap_placement: Drivers | null;
  alerts: Alert[];
  trend: { week: number; value: number }[];
  recourse: Partial<Record<"academic" | "placement", Recourse>>;
  readiness: Readiness | null;
  priority: number;
}

export interface Student {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  branch: string;
  year: number;
  section: string;
  mentor_id: string | null;
}

/** compact row used by tables and the overview */
export interface StudentRow {
  id: string;
  name: string;
  email: string | null;
  branch: string;
  year: number;
  section: string;
  mentor_id: string | null;
  success_score: number;
  academic_risk_prob: number;
  academic_risk_level: RiskLevel;
  placement_risk_prob: number | null;
  placement_risk_level: PlacementLevel;
  intent: string;
  segment_id: number;
  persona: string;
  priority: number;
  alerts: Alert[];
  components: Components;
  metrics: Metrics;
}

export interface Segment {
  id: number;
  persona: string;
  description: string;
  action: string;
  size: number;
  traits: string[];
  centroid: Record<string, number>;
}

export interface Insight {
  id: number;
  kind: string;
  title: string;
  body: string;
  metric: Record<string, unknown>;
  severity: "critical" | "warning" | "info";
  rank: number;
}

export interface InterventionFollowup {
  date: string;
  success_score?: number | null;
  academic_risk_prob?: number | null;
  attendance_pct?: number | null;
  notes?: string | null;
  reviewer_name?: string | null;
}

export interface Intervention {
  id: string;
  student_id: string;
  type: string;
  driver: string | null;
  owner_name: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  notes: string | null;
  baseline: { success_score: number; academic_risk_prob: number; placement_risk_prob: number | null } | null;
  followup?: InterventionFollowup | null;
  outcome?: "improved" | "stable" | "escalated" | "unresolved" | "inconclusive" | null;
  review_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type JourneyCategory = "academic" | "attendance_lms" | "support_intervention" | "milestone_skill" | "alert";

export interface JourneyEvent {
  id: string;
  date: string;
  category: JourneyCategory;
  title: string;
  description: string;
  metric?: string | null;
  status?: string | null;
  source?: string | null;
  isModelDerived?: boolean;
  details?: Record<string, unknown>;
}

export interface StudentPlan {
  id: string;
  student_id: string;
  title: string;
  category: "attendance" | "marks" | "cgpa" | "deadline" | "general";
  target_value: Record<string, unknown>;
  current_value: Record<string, unknown>;
  due_date: string | null;
  status: "active" | "completed" | "archived";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExternalConnection {
  id: string;
  student_id: string;
  provider: string;
  status: "connected" | "syncing" | "last_synced" | "expired" | "auth_required" | "failed" | "manual_import";
  last_synced_at: string | null;
  provenance: "synthetic_demo" | "culko_portal" | "manual_import" | "derived_calc";
  details: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AttendanceCalculation {
  attended: number;
  conducted: number;
  currentPct: number;
  requiredPct: number;
  safeZonePct: number;
  status: "critically_low" | "below_target" | "safe" | "surplus";
  classesNeededForRequired: number;
  classesNeededForSafeZone: number;
  allowedAbsencesAtTarget: number;
  allowedAbsencesAtSafeZone: number;
  projectedPct: number;
  message: string;
  safeMessage: string;
  absenceMessage: string;
}

export interface SubjectMarkScenario {
  subject: string;
  credits: number;
  internalScore: number;
  internalMax: number;
  endSemScore: number | null;
  endSemMax: number;
  currentTotal: number;
  targetTotal: number;
  requiredEndSemScore: number | null;
  isAchievable: boolean;
  gradeBand: string;
  projectedGradePoint: number;
}

export interface CGPAScenario {
  currentCGPA: number;
  completedCredits: number;
  currentSemesterCredits: number;
  targetCGPA: number;
  requiredSGPA: number;
  isAchievable: boolean;
  projectedCGPA: number;
  semesterSubjects: { subject: string; credits: number; targetGradePoint: number }[];
}
