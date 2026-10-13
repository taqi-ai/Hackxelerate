import {
  ChartNoAxesCombined,
  ClipboardCheck,
  DatabaseZap,
  LayoutDashboard,
  MessageSquareText,
  ScanSearch,
  Shapes,
  ShieldCheck,
  Users,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, roles: ["admin", "mentor"], group: "Insight", hint: "Cohort health and insights" },
  { href: "/this-week", label: "This week", icon: ClipboardCheck, roles: ["admin", "mentor"], group: "Insight", hint: "Who to meet first" },
  { href: "/students", label: "Students", icon: Users, roles: ["admin", "mentor"], group: "Insight", hint: "Filter, sort, export" },
  { href: "/segments", label: "Segments", icon: Shapes, roles: ["admin", "mentor"], group: "Insight", hint: "Personas and actions" },
  { href: "/interventions", label: "Interventions", icon: ChartNoAxesCombined, roles: ["admin", "mentor"], group: "Action", hint: "Track what was done" },
  { href: "/ask", label: "Ask Ascora", icon: MessageSquareText, roles: ["admin", "mentor"], group: "Action", hint: "Questions in plain English" },
  { href: "/data", label: "Data integration", icon: DatabaseZap, roles: ["admin"], group: "Trust", hint: "Sources, matching, conflicts" },
  { href: "/model", label: "Score & models", icon: ScanSearch, roles: ["admin", "mentor"], group: "Trust", hint: "Formula, accuracy, drivers" },
  { href: "/fairness", label: "Fairness & privacy", icon: ShieldCheck, roles: ["admin"], group: "Trust", hint: "Audit and safeguards" },
] as const;
