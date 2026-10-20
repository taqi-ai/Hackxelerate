// Builds demo-data/preview/<id>.json (one per student) and demo-data/preview/index.json: the read-only data behind the public "preview as a student" mode.
// Source: demo-data/snapshot.json (the frozen synthetic cohort). Visitors in that mode have no database account,
// so this file is what they read. It carries only the fields the student pages need: no phone numbers,
// no fairness attributes, and every email address masked (including LMS account keys in lineage and links).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(import.meta.dirname, "../demo-data");
const s = JSON.parse(readFileSync(`${dir}/snapshot.json`, "utf8"));
const by = (rows) => new Map(rows.map((r) => [r.student_id, r]));
const many = (rows) => {
  const m = new Map();
  rows.forEach((r) => m.set(r.student_id, [...(m.get(r.student_id) ?? []), r]));
  return m;
};
const mask = (e) => (e ? `${e.split("@")[0].slice(0, 2)}****@${e.split("@")[1]}` : null);
// LMS accounts are email addresses: mask them wherever they appear (lineage, link keys, typed comments)
const maskAll = (v) =>
  typeof v === "string" ? v.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, mask)
  : Array.isArray(v) ? v.map(maskAll)
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, maskAll(x)]))
  : v;
const mentors = new Map(s.mentors.map((m) => [m.id, m.name]));
const T = {
  score: by(s.student_scores), academic: by(s.academic), attendance: by(s.attendance), lms: by(s.lms_activity),
  engagement: by(s.engagement), placement: by(s.placement), skills: by(s.skills),
  feedback: many(s.feedback), conflicts: many(s.conflicts), links: many(s.source_links),
};
const out = {};
for (const st of s.students) {
  const id = st.id;
  out[id] = maskAll({
    student: { id, name: st.name, email: mask(st.email), branch: st.branch, year: st.year, section: st.section, mentor_id: st.mentor_id, mentors: mentors.has(st.mentor_id) ? { name: mentors.get(st.mentor_id) } : null },
    score: T.score.get(id) ?? null, academic: T.academic.get(id) ?? null, attendance: T.attendance.get(id) ?? null,
    lms: T.lms.get(id) ?? null, engagement: T.engagement.get(id) ?? null, placement: T.placement.get(id) ?? null, skills: T.skills.get(id) ?? null,
    feedback: (T.feedback.get(id) ?? []).map(({ course, rating, comment, language, theme, sentiment, lineage }) => ({ course, rating, comment, language, theme, sentiment, lineage })),
    conflicts: T.conflicts.get(id) ?? [],
    links: (T.links.get(id) ?? []).map(({ source, raw_ref, raw_key, match_method, match_confidence, status }) => ({ source, raw_ref, raw_key, match_method, match_confidence, status })),
  });
}
const outDir = `${dir}/preview`;
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
for (const [id, v] of Object.entries(out)) writeFileSync(`${outDir}/${id}.json`, JSON.stringify(v));
writeFileSync(`${outDir}/index.json`, JSON.stringify(s.students.map((x) => [x.id, x.name, x.branch, x.year, x.section])));
console.log("students", Object.keys(out).length);
