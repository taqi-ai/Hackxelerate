export type RiskLevel = "Low" | "Medium" | "High";
export type PlacementLevel = RiskLevel | "N/A";
export type Role = "admin" | "mentor";

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  mentor_id: string | null;
  email?: string;
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

export type Components = Record<
  "academic" | "placement" | "attendance" | "lms" | "skills" | "engagement",
  number
>;

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
  mentors?: { name: string } | null;
}

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

export interface Intervention {
  id: string;
  student_id: string;
  type: string;
  driver: string | null;
  owner_name: string | null;
  due_date: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  notes: string | null;
  baseline: {
    success_score: number;
    academic_risk_prob: number;
    placement_risk_prob: number | null;
  } | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
}

export interface LMSWeekly {
  week: number;
  logins: number;
  due?: number;
  submitted?: number;
  minutes?: number;
}

export interface LMSActivity {
  student_id: string;
  weekly: LMSWeekly[];
}
