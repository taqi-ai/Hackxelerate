import {
  Calculator,
  Calendar,
  ChartNoAxesCombined,
  ClipboardCheck,
  DatabaseZap,
  KeyRound,
  GraduationCap,
  LayoutDashboard,
  Link2,
  MessageSquareText,
  ScanSearch,
  Settings,
  Target,
  Shapes,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

export const NAV_ITEMS = [
  // Institutional Navigation (Admin & Mentor)
  { href: "/overview", label: "Overview", icon: LayoutDashboard, roles: ["admin", "mentor"], group: "Insight", hint: "Cohort health and insights" },
  { href: "/brief", label: "Executive Brief", icon: Sparkles, roles: ["admin", "mentor"], group: "Insight", hint: "Dean's decision brief" },
  { href: "/this-week", label: "This week", icon: ClipboardCheck, roles: ["admin", "mentor"], group: "Insight", hint: "Who to meet first" },
  { href: "/mission-control", label: "Mission Control", icon: Target, roles: ["admin", "mentor"], group: "Action", hint: "Plan support within capacity" },
  { href: "/students", label: "Students", icon: Users, roles: ["admin", "mentor"], group: "Insight", hint: "Filter, sort, export" },
  { href: "/segments", label: "Segments", icon: Shapes, roles: ["admin", "mentor"], group: "Insight", hint: "Personas and actions" },
  { href: "/interventions", label: "Interventions", icon: ChartNoAxesCombined, roles: ["admin", "mentor"], group: "Action", hint: "Track what was done" },
  { href: "/ask", label: "Ask Ascora", icon: MessageSquareText, roles: ["admin", "mentor"], group: "Action", hint: "Questions in plain English" },
  { href: "/data", label: "Data integration", icon: DatabaseZap, roles: ["admin"], group: "Trust", hint: "Sources, matching, conflicts" },
  { href: "/model", label: "Score & models", icon: ScanSearch, roles: ["admin", "mentor"], group: "Trust", hint: "Formula, accuracy, drivers" },
  { href: "/accounts", label: "Accounts", icon: KeyRound, roles: ["admin"], group: "Trust", hint: "Invite and deactivate people" },
  { href: "/fairness", label: "Fairness & privacy", icon: ShieldCheck, roles: ["admin"], group: "Trust", hint: "Audit and safeguards" },

  // Student Navigation (Student Portal)
  { href: "/student", label: "Overview", icon: LayoutDashboard, roles: ["student"], group: "Academic", hint: "Personal snapshot and priorities" },
  { href: "/student/academics", label: "My Academics", icon: GraduationCap, roles: ["student"], group: "Academic", hint: "Attendance, marks, SGPA and CGPA" },
  { href: "/student/calculator", label: "Plan & Improve", icon: Calculator, roles: ["student"], group: "Planning", hint: "What-if scenarios and target planner" },
  { href: "/student/schedule", label: "Schedule & Tasks", icon: Calendar, roles: ["student"], group: "Planning", hint: "Upcoming exams and saved targets" },
  { href: "/student/connection", label: "Data & Portal", icon: Link2, roles: ["student"], group: "Portal", hint: "CU Lucknow connection and data provenance" },

  // Shared Account Settings
  { href: "/settings", label: "Settings", icon: Settings, roles: ["admin", "mentor", "student"], group: "Account", hint: "Theme, defaults, security, status" },
] as const;
