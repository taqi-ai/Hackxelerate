import type { RiskLevel, PlacementLevel } from "@/lib/types";

export type AskEngine = "azure-openai" | "gemini" | "rules" | "offline-cache";

export type AskIntent =
  | "at_risk_students"
  | "placement_drivers"
  | "cgpa_vs_employability"
  | "department_intervention"
  | "student_lookup"
  | "student_filter"
  | "unrecognised";

export interface FilterSchema {
  branch?: string[] | null;
  year?: number[] | null;
  section?: string[] | null;
  academic_risk?: RiskLevel[] | null;
  placement_risk?: RiskLevel[] | null;
  persona?: string[] | null;
  intent?: string[] | null;
  alert?: string[] | null;
  score_min?: number | null;
  score_max?: number | null;
  cgpa_min?: number | null;
  cgpa_max?: number | null;
  attendance_max?: number | null;
  attendance_min?: number | null;
  mocks_max?: number | null;
}

export interface QueryAST {
  filters: FilterSchema;
  sort_by: string;
  sort_dir: "asc" | "desc";
  limit: number;
  group_by: "branch" | "year" | "section" | "persona" | "intent" | "none";
  explanation: string;
}

export interface MatchedStudentItem {
  student_id: string;
  name: string;
  branch: string;
  year: number;
  section: string;
  persona: string;
  success_score: number;
  cgpa: number | null;
  attendance: number | null;
  att_core: number | null;
  backlogs: number | null;
  placement_readiness?: number | null;
  academic_risk_level: RiskLevel;
  academic_risk_prob: number;
  placement_risk_level: PlacementLevel;
  placement_risk_prob: number | null;
  priority: number;
  alerts: string[];
  top_driver?: {
    feature: string;
    label: string;
    impact: number;
    text: string;
    actionable: boolean;
  } | null;
  suggested_action?: string;
  mentor?: string | null;
}

export interface CohortSummaryData {
  count: number;
  academic_risk_levels: Record<RiskLevel, number>;
  placement_risk_levels: Record<RiskLevel | "N/A", number>;
  mean_cgpa: number | null;
  mean_attendance: number | null;
  mean_core_attendance: number | null;
  mean_success_score: number | null;
  mean_placement_readiness: number | null;
  top_personas?: { persona: string; count: number }[];
  high_risk_share: number;
}

export interface RecommendedInterventionData {
  target: string;
  target_count: number;
  dimension: "academic" | "placement";
  action: string;
  intervention_type: string;
  driver_feature: string | null;
  reason: string;
  owner: string;
  priority: string;
  priority_reason?: string;
  segment_playbook?: { persona: string; note: string };
  workflow?: { system: string; how: string; status: string };
  expected_impact?: string;
}

export interface PredictionEvidenceData {
  academic: {
    meaning: string;
    levels: { medium_from: number; high_from: number };
    mean_probability: number;
  };
  placement: {
    meaning: string;
    levels: { medium_from: number; high_from: number };
    mean_probability: number;
  };
  model: string;
}

export interface DriverEvidenceData {
  method: string;
  provenance: string;
  academic?: {
    dimension: string;
    cohort_top_drivers: Array<{
      feature: string;
      label: string;
      students_affected: number;
      mean_impact: number;
      actionable: boolean;
    }>;
  };
  placement?: {
    dimension: string;
    cohort_top_drivers: Array<{
      feature: string;
      label: string;
      students_affected: number;
      mean_impact: number;
      actionable: boolean;
    }>;
  };
}

export interface AskGroundedResponse {
  contract_version?: string;
  question: string;
  engine: AskEngine | string;
  query: QueryAST;
  intent: AskIntent;
  answer: string;
  applied_filters: Record<string, unknown>;
  matched_count: number;
  cohort_summary: CohortSummaryData;
  matched_students: MatchedStudentItem[];
  prediction_evidence: PredictionEvidenceData | null;
  driver_evidence: DriverEvidenceData | null;
  recommended_intervention: RecommendedInterventionData | null;
  scope: {
    role?: string;
    scope?: string;
    available?: boolean;
  };
  limitations: string[];
}

export interface JudgePreset {
  id: string;
  title: string;
  question: string;
  category: "official" | "deep-dive";
  badge: string;
  hint: string;
  query: QueryAST;
}
