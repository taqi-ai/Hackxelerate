"""The integration pipeline: 7 messy sources -> one unified, lineage-tracked student view.

Each step is timed and logged into a StepLog so the UI can render it live and the
data-quality report can be stored with the run."""
from __future__ import annotations

import re
import time
import uuid
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Callable

import numpy as np
import pandas as pd

from .config import ATTENDANCE_CONFLICT_PTS, CONFLICT_RULES, MATCH_AUTO, MATCH_REVIEW
from .clean.normalize import (BRANCH_CODE, CODE_BRANCH, clip_range, normalize_branch, normalize_email,
                              normalize_name, normalize_roll, parse_date, to_0_100)
from .clean.resolve import (Roster, batch_to_year, evaluate_links, link_by_email, link_by_name, link_by_roll)
from .ingest.readers import SOURCE_LABELS, SourceFrame, read_folder
from .freshness import source_freshness

SEM_START = date(2026, 7, 20)
CORE_SUBJECTS = {"Data Structures", "Database Management Systems", "Operating Systems", "Computer Networks",
                 "Analog Circuits", "Digital System Design", "VLSI Design", "Thermodynamics", "Fluid Mechanics",
                 "Heat Transfer", "Machine Learning", "Signals & Systems", "Digital Signal Processing"}
GATEKEEPERS = {"Mathematics-II", "Data Structures", "Signals & Systems", "Thermodynamics"}


# --------------------------------------------------------------------------- step log

@dataclass
class Step:
    key: str
    label: str
    status: str = "pending"      # pending | running | done | error
    started: float | None = None
    seconds: float | None = None
    metrics: dict = field(default_factory=dict)
    detail: list[str] = field(default_factory=list)


class StepLog:
    STEPS = [
        ("ingest", "Ingest & auto-map columns"),
        ("standardize", "Standardise IDs, names, dates, scales"),
        ("resolve", "Entity resolution (fuzzy student matching)"),
        ("dedupe", "Merge duplicates"),
        ("conflicts", "Detect & resolve cross-source conflicts"),
        ("unify", "Build unified student view with lineage"),
        ("features", "Feature engineering"),
        ("score", "Success Score"),
        ("models", "Risk models + SHAP explanations"),
        ("segments", "Segmentation & personas"),
        ("insights", "Cross-source insights"),
        ("publish", "Publish to database"),
    ]

    def __init__(self, on_change: Callable[["StepLog"], None] | None = None):
        self.run_id = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
        self.steps = {k: Step(k, label) for k, label in self.STEPS}
        self.on_change = on_change

    def start(self, key):
        s = self.steps[key]
        s.status, s.started = "running", time.perf_counter()
        self._emit()

    def done(self, key, **metrics):
        s = self.steps[key]
        s.status = "done"
        s.seconds = round(time.perf_counter() - (s.started or time.perf_counter()), 3)
        s.metrics.update(metrics)
        self._emit()

    def note(self, key, text):
        self.steps[key].detail.append(text)

    def fail(self, key, err: str):
        s = self.steps[key]
        s.status = "error"
        s.detail.append(err)
        self._emit()

    def skip(self, key, reason: str):
        s = self.steps[key]
        s.status = "skipped"
        s.detail.append(reason)
        self._emit()

    def _emit(self):
        if self.on_change:
            self.on_change(self)

    def as_list(self) -> list[dict]:
        return [dict(key=s.key, label=s.label, status=s.status, seconds=s.seconds, metrics=s.metrics, detail=s.detail)
                for s in self.steps.values()]


# --------------------------------------------------------------------------- helpers

def _num(s: pd.Series) -> pd.Series:
    return pd.to_numeric(s, errors="coerce")


def _yn(v) -> bool | None:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return str(v).strip().upper() in ("Y", "YES", "TRUE", "1")


def _slope(y: list[float]) -> float:
    y = np.asarray([v for v in y if v is not None and not np.isnan(v)], dtype=float)
    if len(y) < 3:
        return 0.0
    x = np.arange(len(y))
    return float(np.polyfit(x, y, 1)[0])


def detect_language(text: str) -> str:
    if re.search(r"[ऀ-ॿ]", text or ""):
        return "hi"
    hinglish = {"hai", "hain", "bahut", "nahi", "kuch", "thoda", "mein", "accha", "theek", "ho", "rahi", "raha", "sir", "ka", "ki", "mast", "chahiye"}
    words = set(re.findall(r"[a-z]+", (text or "").lower()))
    return "hinglish" if len(words & hinglish) >= 2 else "en"


THEMES = {
    "workload & deadlines": ["assignment", "deadline", "syllabus", "time", "असाइनमेंट", "सिलेबस", "समय", "zyada"],
    "teaching quality": ["explain", "teaching", "boring", "slides", "concept", "पढ़ाते", "स्लाइड", "samajh", "padhte", "engaging"],
    "labs & practicals": ["lab", "practical", "equipment", "लैब"],
    "pace": ["pace", "fast", "गति", "speed"],
    "practice material": ["practice", "examples", "problems", "अभ्यास"],
}
NEG = ["boring", "hard", "too many", "too much", "lost", "cancel", "नहीं", "रद्द", "समझ नहीं", "nahi", "clash", "बहुत ज़्यादा", "bilkul"]
POS = ["good", "clear", "useful", "engaging", "well", "accha", "mast", "अच्छ", "उपयोगी", "helped"]


def tag_feedback(text: str, rating: float | None) -> tuple[str, str]:
    t = (text or "").lower()
    theme = next((k for k, kws in THEMES.items() if any(w.lower() in t for w in kws)), "general")
    score = sum(w.lower() in t for w in POS) - sum(w.lower() in t for w in NEG)
    if rating is not None and not np.isnan(rating):
        score += (rating - 3)
    sentiment = "positive" if score > 0.5 else "negative" if score < -0.5 else "neutral"
    return theme, sentiment


# --------------------------------------------------------------------------- pipeline

@dataclass
class PipelineResult:
    run_id: str
    students: pd.DataFrame
    tables: dict[str, pd.DataFrame]
    features: pd.DataFrame
    weekly: pd.DataFrame
    links: pd.DataFrame
    conflicts: pd.DataFrame
    report: dict
    mentors: pd.DataFrame


def run_integration(folder: Path, log: StepLog, truth_dir: Path | None = None) -> PipelineResult:
    report: dict = {"run_id": log.run_id, "sources": {}}

    # ---------------------------------------------------------------- 1. ingest
    log.start("ingest")
    frames: dict[str, SourceFrame] = read_folder(folder)
    for k, sf in frames.items():
        report["sources"][k] = {"label": SOURCE_LABELS.get(k, k), "file": sf.file, "rows_in": sf.rows_in,
                                "mapping": sf.mapping, "notes": list(sf.notes)}
        log.note("ingest", f"{sf.file}: detected as '{SOURCE_LABELS.get(k, k)}', {sf.rows_in:,} rows, "
                           f"{len(sf.mapping.get('columns', {}))} columns mapped, {len(sf.mapping.get('unmapped', []))} unmapped")
    missing = [s for s in SOURCE_LABELS if s not in frames]
    log.done("ingest", files=len(frames), rows=sum(sf.rows_in for sf in frames.values()), missing_sources=missing)
    mentors_path = folder / "mentors.csv"
    mentors = pd.read_csv(mentors_path) if mentors_path.exists() else pd.DataFrame(columns=["id", "name", "department"])

    # ---------------------------------------------------------------- 2. standardise
    log.start("standardize")
    fixes = {}
    erp = frames["erp_academics"].df.copy()
    erp["roll_raw"] = erp["roll"]
    erp["roll"] = erp["roll"].map(normalize_roll)
    erp["name"] = erp["name"].map(normalize_name)
    erp["branch"] = erp["branch"].map(normalize_branch)
    for col, lo, hi in (("internal", 0, 40), ("end_sem", 0, 60), ("total", 0, 100), ("sgpa", 0, 10), ("cgpa", 0, 10),
                        ("attendance_pct", 0, 100), ("backlogs", 0, 40), ("semester", 1, 8)):
        erp[col], n = clip_range(_num(erp[col]), lo, hi)
        if n:
            fixes[f"erp.{col} out of range"] = n
    missing_internal = int(erp["internal"].isna().sum())

    att = frames["attendance_register"].df.copy()
    att["held"] = _num(att["held"])
    att["attended"] = _num(att["attended"])
    impossible = att["attended"] > att["held"]
    fixes["attendance.attended > held (capped)"] = int(impossible.sum())
    att.loc[impossible, "attended"] = att.loc[impossible, "held"]
    att["month"] = att["src_sheet"].str.slice(0, 3)

    lms = frames["lms_activity_log"].df.copy()
    lms["email"] = lms["email"].map(normalize_email)
    lms["date"] = lms["week_start"].map(parse_date)
    fmt_mix = lms["week_start"].astype(str).str.match(r"^\d{2}-\d{2}-\d{4}$").sum()
    fixes["lms.dates converted from DD-MM-YYYY"] = int(fmt_mix)
    lms["week"] = lms["date"].map(lambda d: (d - SEM_START).days // 7 + 1 if d else np.nan)
    for c in ("logins", "due", "submitted", "minutes"):
        lms[c] = _num(lms[c])

    clubs = frames["clubs_events"].df.copy()
    clubs["date_parsed"] = clubs["date"].map(parse_date)
    fixes["clubs.dates in 3 formats unified"] = int(clubs["date_parsed"].notna().sum())
    clubs["type"] = clubs["type"].str.strip().str.lower()

    pl = frames["placement_cell"].df.copy()
    for c, lo, hi in (("aptitude", 0, 100), ("coding", 0, 100), ("mocks", 0, 50), ("mock_rating", 1, 5)):
        pl[c], n = clip_range(_num(pl[c]), lo, hi)
        if n:
            fixes[f"placement.{c} out of range"] = n

    sk = frames["skills_assessment"].df.copy()
    rescaled = 0
    tech_all, soft_all = [], []
    for t, s in zip(sk["technical"], sk["soft"]):
        combined, was10 = to_0_100({**{f"t_{k}": v for k, v in t.items()}, **{f"s_{k}": v for k, v in s.items()}})
        rescaled += was10
        tech_all.append({k[2:]: v for k, v in combined.items() if k.startswith("t_")})
        soft_all.append({k[2:]: v for k, v in combined.items() if k.startswith("s_")})
    sk["technical"], sk["soft"] = tech_all, soft_all
    fixes["skills.0-10 scale rescaled to 0-100"] = rescaled

    fb = frames["feedback_forms"].df.copy()
    fb["rating"] = _num(fb["rating"])
    fb["language"] = fb["comment"].map(detect_language)
    tags = [tag_feedback(c, r) for c, r in zip(fb["comment"], fb["rating"])]
    fb["theme"] = [t[0] for t in tags]
    fb["sentiment"] = [t[1] for t in tags]
    report["freshness"] = source_freshness(
        attendance_sheets=att["src_sheet"].dropna().tolist(),
        lms_dates=lms["date"].tolist(),
        club_dates=clubs["date_parsed"].tolist(),
        feedback_dates=fb["date"].map(parse_date).tolist() if "date" in fb else [],
        skills_exported_at=frames["skills_assessment"].meta.get("exported_at"),
        erp_max_semester=erp["semester"].max(),
        has_placement="placement_cell" in frames,
        run_date=date.today(),
    )
    log.done("standardize", fixes=fixes, missing_internal_marks=missing_internal,
             roll_formats_normalised=4, languages=fb["language"].value_counts().to_dict())

    # ---------------------------------------------------------------- 3. roster + entity resolution
    log.start("resolve")
    erp_valid = erp[erp["roll"].notna()]
    roster_rows = []
    for sid, g in erp_valid.groupby("roll"):
        yy = int(sid[2:4])
        code = re.match(r"CU\d{2}([A-Z]+)\d+", sid).group(1)
        first = g.iloc[0]
        roster_rows.append(dict(
            student_id=sid, name=g["name"].mode().iat[0], branch_erp=g["branch"].mode().iat[0],
            branch_roll=CODE_BRANCH.get(code), year=batch_to_year(yy), batch=yy,
            section=first.get("section"), mentor_id=first.get("mentor_id"), gender=first.get("gender"),
            hosteller=(str(first.get("residence", "")).lower().startswith("host")),
            first_generation=_yn(first.get("first_gen")), lateral_entry=_yn(first.get("lateral")),
            schooling_medium=first.get("medium"),
        ))
    roster_df = pd.DataFrame(roster_rows)
    roster_df["branch"] = roster_df["branch_roll"]       # roll code is authoritative for blocking
    roster = Roster.from_frame(roster_df[["student_id", "name", "branch", "year"]])
    ids = set(roster_df.student_id)

    links = [link_by_roll(erp.assign(roll=erp["roll_raw"]), "erp_academics", ids),
             link_by_roll(att, "attendance_register", ids),
             link_by_email(lms, "lms_activity_log", roster),
             link_by_name(clubs, "clubs_events", roster),
             link_by_roll(pl, "placement_cell", ids),
             link_by_roll(sk, "skills_assessment", ids)]
    fb_named = fb[fb["roll"].notna() & (fb["roll"].astype(str).str.strip() != "")]
    links.append(link_by_roll(fb_named, "feedback_forms", ids))
    links = pd.concat(links, ignore_index=True)

    summary = {}
    for src, g in links.groupby("source"):
        summary[src] = {"rows": int(len(g)), "auto": int((g.status == "auto").sum()), "review": int((g.status == "review").sum()),
                        "rejected": int((g.status == "rejected").sum()),
                        "match_rate": round(float((g.status == "auto").mean()), 4),
                        "methods": g.match_method.value_counts().to_dict()}
    summary["feedback_forms"]["anonymous_rows_kept_unlinked"] = int(len(fb) - len(fb_named))
    hist = np.histogram(links.loc[links.match_method.isin(["email_name_block", "name_fuzzy_block"]), "match_confidence"],
                        bins=[0, .5, .6, .7, .75, .8, .85, .9, .95, 1.0001])[0].tolist()
    report["matching"] = {"by_source": summary, "thresholds": {"auto": MATCH_AUTO, "review": MATCH_REVIEW},
                          "fuzzy_confidence_histogram": {"bins": ["<.5", ".5", ".6", ".7", ".75", ".8", ".85", ".9", ".95"], "counts": hist}}

    # evaluation against the hidden truth (only if the generator's truth file is present)
    if truth_dir and (truth_dir / "_truth_links.parquet").exists():
        truth = pd.read_parquet(truth_dir / "_truth_links.parquet")
        anon_keys = set(fb.loc[~fb.index.isin(fb_named.index), "src_key"])
        ev = {src: evaluate_links(links, truth, src, exclude_keys=anon_keys if src == "feedback_forms" else None)
              for src in ["erp_academics", "attendance_register", "lms_activity_log", "clubs_events", "placement_cell",
                          "skills_assessment", "feedback_forms"]}
        fuzzy = [ev["lms_activity_log"], ev["clubs_events"]]
        report["matching"]["evaluation_vs_truth"] = ev
        report["matching"]["fuzzy_overall"] = {
            "precision_auto": round(sum(e["precision_auto"] * e["auto_linked"] for e in fuzzy) / max(1, sum(e["auto_linked"] for e in fuzzy)), 4),
            "recall_auto": round(sum(e["recall_auto"] * e["identities"] for e in fuzzy) / max(1, sum(e["identities"] for e in fuzzy)), 4),
        }
        log.note("resolve", f"Fuzzy matching vs hidden truth: precision {report['matching']['fuzzy_overall']['precision_auto']:.1%}, "
                            f"recall {report['matching']['fuzzy_overall']['recall_auto']:.1%}")
    log.done("resolve", students=len(roster_df), links=int(len(links)),
             auto=int((links.status == "auto").sum()), review=int((links.status == "review").sum()),
             rejected=int((links.status == "rejected").sum()))

    # attach student ids (only auto-accepted links feed analytics; review links wait for a human)
    def attach(df: pd.DataFrame, src: str, key: str = "src_ref") -> pd.DataFrame:
        lk = links[(links.source == src) & (links.status == "auto")].drop_duplicates("raw_ref").set_index("raw_ref")
        out = df.copy()
        out["student_id"] = out[key].map(lk["student_id"])
        return out[out["student_id"].notna()]

    att_l, lms_l, clubs_l = attach(att, "attendance_register"), attach(lms, "lms_activity_log"), attach(clubs, "clubs_events")
    pl_l, sk_l = attach(pl, "placement_cell"), attach(sk, "skills_assessment")
    fb_l = fb.copy()
    fbk = links[(links.source == "feedback_forms") & (links.status == "auto")].set_index("raw_ref")["student_id"]
    fb_l["student_id"] = fb_l["src_ref"].map(fbk)

    # ---------------------------------------------------------------- 4. dedupe
    log.start("dedupe")
    n0 = len(erp_valid)
    erp_d = erp_valid.drop_duplicates(["roll", "semester", "subject"])
    pl_l["_filled"] = pl_l[["aptitude", "coding", "mocks"]].notna().sum(axis=1)
    pl_d = pl_l.sort_values("_filled", ascending=False).drop_duplicates("student_id")
    lms_accounts = lms_l.groupby("student_id")["email"].nunique()
    clubs_d = clubs_l.drop_duplicates(["student_id", "event", "date_parsed"])
    log.done("dedupe", erp_duplicate_rows=int(n0 - len(erp_d)), placement_duplicate_rows=int(len(pl_l) - len(pl_d)),
             lms_students_with_multiple_accounts_merged=int((lms_accounts > 1).sum()),
             clubs_duplicate_records=int(len(clubs_l) - len(clubs_d)))

    # ---------------------------------------------------------------- 5. conflicts
    log.start("conflicts")
    conflicts = []
    att_overall = att_l.groupby("student_id").apply(lambda g: 100 * g["attended"].sum() / max(1, g["held"].sum()), include_groups=False)
    cur_sem = erp_d.groupby("roll")["semester"].transform("max")
    erp_att = erp_d[erp_d["semester"] == cur_sem].groupby("roll")["attendance_pct"].mean()
    for sid, v in erp_att.dropna().items():
        if sid in att_overall.index and abs(v - att_overall[sid]) > ATTENDANCE_CONFLICT_PTS:
            conflicts.append(dict(student_id=sid, attribute="attendance_pct", source_a="erp_academics", value_a=f"{v:.1f}",
                                  source_b="attendance_register", value_b=f"{att_overall[sid]:.1f}",
                                  resolution=CONFLICT_RULES["attendance_pct"][1], resolved_value=f"{att_overall[sid]:.1f}"))
    # branch: vote across roll code, ERP, placement, LMS program, clubs
    votes: dict[str, list[tuple[str, str]]] = {sid: [("roll_code", b), ("erp_academics", e)]
                                               for sid, b, e in zip(roster_df.student_id, roster_df.branch_roll, roster_df.branch_erp)}
    for sid, b in zip(pl_d["student_id"], pl_d["branch"].map(normalize_branch)):
        if b:
            votes[sid].append(("placement_cell", b))
    from .clean.resolve import parse_program
    prog = lms_l.drop_duplicates("student_id")
    for sid, p in zip(prog["student_id"], prog["program"]):
        b, _ = parse_program(p)
        if b:
            votes[sid].append(("lms_activity_log", b))
    resolved_branch = {}
    for sid, vs in votes.items():
        counts = pd.Series([b for _, b in vs]).value_counts()
        winner = counts.index[0]
        resolved_branch[sid] = winner
        erp_b = dict(vs)["erp_academics"]
        if erp_b != winner:
            other = next(src for src, b in vs if b == winner and src != "erp_academics")
            conflicts.append(dict(student_id=sid, attribute="branch", source_a="erp_academics", value_a=erp_b,
                                  source_b=other, value_b=winner,
                                  resolution=f"{CONFLICT_RULES['branch'][1]} ({counts.iat[0]} of {len(vs)} sources agree)",
                                  resolved_value=winner))
    conflicts_df = pd.DataFrame(conflicts)
    roster_df["branch"] = roster_df.student_id.map(resolved_branch)
    log.done("conflicts", total=len(conflicts_df),
             by_attribute=conflicts_df["attribute"].value_counts().to_dict() if len(conflicts_df) else {})

    # ---------------------------------------------------------------- 6. unify
    log.start("unify")
    tables = {}
    # academic
    acad_rows = []
    for sid, g in erp_d.groupby("roll"):
        cur = g["semester"].max()
        past = g[g["semester"] < cur]
        sg = past.dropna(subset=["sgpa"]).groupby("semester")["sgpa"].first()
        subj = [dict(sem=int(r.semester), subject=r.subject, internal=None if pd.isna(r.internal) else float(r.internal),
                     end_sem=None if pd.isna(r.end_sem) else float(r.end_sem), total=None if pd.isna(r.total) else float(r.total),
                     ref=r.src_ref) for r in g.sort_values(["semester", "subject"]).itertuples()]
        cg = g["cgpa"].dropna()
        acad_rows.append(dict(student_id=sid, cgpa=float(cg.mode().iat[0]) if len(cg) else None,
                              backlogs=int(g["backlogs"].dropna().max()) if g["backlogs"].notna().any() else 0,
                              sgpa={str(int(k)): float(v) for k, v in sg.items()}, subjects=subj,
                              lineage={"cgpa": g.loc[cg.index[0], "src_ref"] if len(cg) else None, "file": "erp_academics.csv",
                                       "rows": int(len(g))}))
    tables["academic"] = pd.DataFrame(acad_rows)

    # attendance
    def pct_table(keys):
        agg = att_l.groupby(keys)[["attended", "held"]].sum()
        return (100 * agg["attended"] / agg["held"].clip(lower=1)).round(1)
    overall_s = pct_table(["student_id"])
    core_s = att_l[att_l["subject"].isin(CORE_SUBJECTS)].groupby("student_id")[["attended", "held"]].sum()
    core_s = (100 * core_s["attended"] / core_s["held"].clip(lower=1)).round(2)
    by_sub_all = pct_table(["student_id", "subject"])
    by_mon_all = pct_table(["student_id", "month"])
    first_ref_all = att_l.groupby(["student_id", "month"])["src_ref"].first()
    n_rows = att_l.groupby("student_id").size()
    att_rows = []
    for sid in overall_s.index:
        bm = by_mon_all.loc[sid]
        att_rows.append(dict(student_id=sid, overall_pct=float(overall_s[sid]), core_pct=float(core_s.get(sid, overall_s[sid])),
                             by_subject=by_sub_all.loc[sid].to_dict(),
                             by_month={m: float(bm[m]) for m in ("Aug", "Sep", "Oct") if m in bm.index},
                             lineage={"file": "attendance_register.xlsx", "rows": int(n_rows[sid]),
                                      "by_month": first_ref_all.loc[sid].to_dict()}))
    tables["attendance"] = pd.DataFrame(att_rows)

    # LMS weekly (accounts merged)
    wk = (lms_l.dropna(subset=["week"]).groupby(["student_id", "week"])
          .agg(logins=("logins", "sum"), due=("due", "sum"), submitted=("submitted", "sum"), minutes=("minutes", "sum"))
          .reset_index())
    lms_rows = []
    lms_nrows = lms_l.groupby("student_id").size()
    lms_accts = lms_l.groupby("student_id")["email"].unique()
    for sid, g in wk.groupby("student_id"):
        g = g.sort_values("week")
        lms_rows.append(dict(student_id=sid, login_freq=round(float(g["logins"].mean()), 2),
                             completion_rate=round(100 * float(g["submitted"].sum() / max(1, g["due"].sum())), 2),
                             minutes_per_week=round(float(g["minutes"].mean()), 1), trend_slope=round(_slope(list(g["logins"])), 4),
                             weekly=[dict(week=int(r.week), logins=int(r.logins), due=int(r.due), submitted=int(r.submitted),
                                          minutes=int(r.minutes)) for r in g.itertuples()],
                             lineage={"file": "lms_activity_log.csv", "rows": int(lms_nrows[sid]),
                                      "accounts": sorted(lms_accts[sid].tolist())}))
    tables["lms_activity"] = pd.DataFrame(lms_rows)

    # engagement
    eng_rows = []
    by_sid = {sid: g for sid, g in clubs_d.groupby("student_id")}
    for sid in roster_df.student_id:
        g = by_sid.get(sid)
        if g is None:
            eng_rows.append(dict(student_id=sid, hackathons=0, clubs=0, workshops=0, certifications=0, events=[],
                                 lineage={"file": "clubs_events.csv", "rows": 0}))
            continue
        vc = g["type"].value_counts()
        eng_rows.append(dict(student_id=sid, hackathons=int(vc.get("hackathon", 0)), clubs=int(vc.get("club", 0)),
                             workshops=int(vc.get("workshop", 0)), certifications=int(vc.get("certification", 0)),
                             events=[dict(event=r.event, type=r.type, date=r.date_parsed.isoformat() if r.date_parsed else None,
                                          ref=r.src_ref) for r in g.sort_values("date_parsed").itertuples()],
                             lineage={"file": "clubs_events.csv", "rows": int(len(g))}))
    tables["engagement"] = pd.DataFrame(eng_rows)

    # placement
    def intent_norm(v):
        v = str(v or "").strip().lower().replace(" ", "_")
        return v if v in ("placement", "higher_studies", "govt_exams", "entrepreneurship", "undecided") else None
    tables["placement"] = pd.DataFrame([dict(
        student_id=r.student_id, aptitude=None if pd.isna(r.aptitude) else float(r.aptitude),
        coding=None if pd.isna(r.coding) else float(r.coding), mocks_attended=None if pd.isna(r.mocks) else int(r.mocks),
        mock_rating=None if pd.isna(r.mock_rating) else float(r.mock_rating), intent=intent_norm(r.intent),
        visited_cell=bool(pd.notna(r.aptitude) or pd.notna(r.coding)), lineage={"row": r.src_ref}) for r in pl_d.itertuples()])

    # skills
    sk_l = sk_l.drop_duplicates("student_id")
    tables["skills"] = pd.DataFrame([dict(
        student_id=r.student_id, technical=r.technical, soft=r.soft,
        technical_avg=round(float(np.nanmean([v for v in r.technical.values() if v is not None])), 2),
        soft_avg=round(float(np.nanmean([v for v in r.soft.values() if v is not None])), 2),
        lineage={"record": r.src_ref, "vendor": r.vendor}) for r in sk_l.itertuples()])

    # feedback
    tables["feedback"] = pd.DataFrame([dict(
        student_id=None if pd.isna(r.student_id) else r.student_id, course=r.course,
        rating=None if pd.isna(r.rating) else int(r.rating), comment=r.comment, language=r.language, theme=r.theme,
        sentiment=r.sentiment, lineage={"row": r.src_ref}) for r in fb_l.itertuples()])

    # students (unified identity)
    email_primary = (lms_l.groupby(["student_id", "email"]).size().reset_index(name="n")
                     .sort_values("n", ascending=False).drop_duplicates("student_id").set_index("student_id")["email"])
    phone = pl_d.set_index("student_id")["phone"]
    students = roster_df.assign(email=roster_df.student_id.map(email_primary), phone=roster_df.student_id.map(phone))
    students = students[["student_id", "name", "email", "phone", "branch", "year", "section", "mentor_id", "gender",
                         "hosteller", "first_generation", "lateral_entry", "schooling_medium"]]
    coverage = {k: int(v["student_id"].nunique()) for k, v in tables.items() if "student_id" in v and k != "feedback"}
    coverage["feedback"] = int(tables["feedback"]["student_id"].nunique())
    log.done("unify", students=len(students), coverage=coverage)

    report["quality"] = {
        "rows_in": {k: sf.rows_in for k, sf in frames.items()},
        "fixes": fixes, "missing_internal_marks": missing_internal,
        "coverage": {k: round(v / len(students), 4) for k, v in coverage.items()},
        "conflicts": int(len(conflicts_df)),
    }
    report["steps"] = log.as_list()

    links_out = links[links.status != "rejected"].copy()
    links_out = links_out.drop_duplicates(["source", "raw_value", "student_id"])  # one link per identity, not per row
    return PipelineResult(run_id=log.run_id, students=students, tables=tables, features=pd.DataFrame(), weekly=wk,
                          links=links_out, conflicts=conflicts_df, report=report, mentors=mentors)
