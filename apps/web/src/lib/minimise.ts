import { maskEmail, maskPhone } from "./format";

/** What a staff screen may receive about a student. Anything sent to a client component ends up in the browser's
 *  page payload even if it is never drawn, so raw contacts and the fairness-only attributes (gender, residence,
 *  first-generation, lateral entry, schooling medium) are dropped here, on the server. */
export const STUDENT_PUBLIC_COLUMNS = "id, name, email, phone, branch, year, section, mentor_id, institution_id, mentors(name)";

export function publicStudent<T extends Record<string, unknown>>(row: T) {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email ? maskEmail(row.email as string) : null,
    phone: row.phone ? maskPhone(row.phone as string) : null,
    branch: row.branch as string,
    year: row.year as number,
    section: row.section as string,
    mentor_id: (row.mentor_id as string | null) ?? null,
    mentors: (row.mentors as { name: string } | null | undefined) ?? null,
  };
}

export function maskedEmail(e: string | null | undefined) {
  return e ? maskEmail(e) : null;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?<!\d)(?:\+91[\s-]?)?[6-9]\d{9}(?!\d)/g;

/** Masks every email address and Indian mobile number anywhere inside a value: lineage (LMS accounts are emails),
 *  source-link keys, and anything a student typed into a feedback comment. Already-masked values are left alone. */
export function maskContactsDeep<T>(v: T): T {
  if (typeof v === "string") return v.replace(EMAIL, (m) => maskEmail(m)).replace(PHONE, (m) => maskPhone(m)) as T;
  if (Array.isArray(v)) return v.map((x) => maskContactsDeep(x)) as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, maskContactsDeep(x)])) as T;
  return v;
}
