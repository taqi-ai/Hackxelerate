import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import { cookies } from "next/headers";
import type { ExternalConnection, StudentPlan } from "@/lib/types";

/**
 * Public "preview as a student" mode.
 *
 * A visitor picks one student from the synthetic demo cohort on the login page and sees that student's own pages
 * without an account. Such a visitor has no database identity, and row-level security rightly gives them nothing, so
 * this mode reads read-only files built from the frozen demo cohort (demo-data/preview, see
 * scripts/build-student-preview.mjs). Anything the visitor saves (plans, a manual import) is kept in their own
 * browser cookie and labelled as such in the UI. No anonymous database access exists.
 */

export const DEMO_STUDENT_COOKIE = "ascora_demo_student";

/** The public student preview serves the synthetic evaluation cohort. It is off unless a deployment opts in, so an
 *  institution's production deployment can never fall back to fixture students. */
export const PREVIEW_ENABLED = process.env.ASCORA_PUBLIC_PREVIEW === "1";
export const DEMO_PLANS_COOKIE = "ascora_demo_plans";
export const DEMO_IMPORT_COOKIE = "ascora_demo_import";
export const DEMO_ID = /^CU\d{2}[A-Z]{2,4}\d{4}$/;
const MAX_PLANS = 6;
const COOKIE_BUDGET = 3600; // bytes, under the 4 KB browser limit

const DIR = path.join(process.cwd(), "demo-data", "preview");

export type PreviewStudent = {
  student: { id: string; name: string; email: string | null; phone?: string | null; branch: string; year: number; section: string; mentor_id: string | null; mentors: { name: string } | null };
  score: any;
  academic: any;
  attendance: any;
  lms: any;
  engagement: any;
  placement: any;
  skills: any;
  feedback: any[];
  conflicts: any[];
  links: any[];
};

export const previewStudent = cache(async (id: string): Promise<PreviewStudent | null> => {
  if (!DEMO_ID.test(id)) return null;
  try {
    return JSON.parse(await readFile(path.join(DIR, `${id}.json`), "utf8")) as PreviewStudent;
  } catch {
    return null;
  }
});

type IndexRow = [id: string, name: string, branch: string, year: number, section: string];
let index: Promise<IndexRow[]> | null = null;
function previewIndex() {
  index ??= readFile(path.join(DIR, "index.json"), "utf8").then((s) => JSON.parse(s) as IndexRow[]);
  return index;
}

export async function searchPreview(query = "", branch?: string, year?: number, limit = 20) {
  const q = query.trim().toLowerCase();
  const rows = await previewIndex().catch(() => [] as IndexRow[]);
  return rows
    .filter(([id, name, b, y]) => (!q || id.toLowerCase().includes(q) || name.toLowerCase().includes(q)) && (!branch || branch === "all" || b === branch) && (!year || y === year))
    .slice(0, Math.min(Math.max(limit, 1), 50))
    .map(([id, name, b, y, section]) => ({ id, name, branch: b, year: y, section }));
}

/** The demo student this visitor picked, if any (only when they have no real session in that role). */
export async function demoStudentId(): Promise<string | null> {
  const v = (await cookies()).get(DEMO_STUDENT_COOKIE)?.value;
  return v && DEMO_ID.test(v) ? v : null;
}

type StoredPlans = { sid: string; plans: StudentPlan[] };

export async function readDemoPlans(studentId: string): Promise<StudentPlan[]> {
  const raw = (await cookies()).get(DEMO_PLANS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as StoredPlans;
    return v.sid === studentId && Array.isArray(v.plans) ? v.plans : [];
  } catch {
    return [];
  }
}

/** Persist plans for the picked student in a cookie. Returns false when they cannot fit (caller reports it). */
export async function writeDemoPlans(studentId: string, plans: StudentPlan[]): Promise<boolean> {
  let list = plans.slice(0, MAX_PLANS);
  let raw = JSON.stringify({ sid: studentId, plans: list } satisfies StoredPlans);
  while (raw.length > COOKIE_BUDGET && list.length > 1) {
    list = list.slice(0, -1);
    raw = JSON.stringify({ sid: studentId, plans: list });
  }
  if (raw.length > COOKIE_BUDGET) return false;
  (await cookies()).set(DEMO_PLANS_COOKIE, raw, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return true;
}

export const DEMO_PLAN_LIMIT = MAX_PLANS;

export async function readDemoImport(studentId: string): Promise<ExternalConnection | null> {
  const raw = (await cookies()).get(DEMO_IMPORT_COOKIE)?.value;
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as ExternalConnection;
    return v.student_id === studentId ? v : null;
  } catch {
    return null;
  }
}

export async function writeDemoImport(conn: ExternalConnection) {
  (await cookies()).set(DEMO_IMPORT_COOKIE, JSON.stringify(conn).slice(0, COOKIE_BUDGET), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** What the student pages show as data provenance in preview mode. */
export function previewConnection(studentId: string): ExternalConnection {
  return {
    id: `conn-${studentId}`,
    student_id: studentId,
    provider: "demo_cohort",
    status: "manual_import",
    last_synced_at: null,
    provenance: "synthetic_demo",
    details: { cohort_version: "HacXLerate 2026 frozen demo cohort" },
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}
