"""End-to-end run: integration -> intelligence -> publish. Also keeps the in-memory state used by
the what-if simulator, and writes a JSON snapshot used by the web app's offline demo mode."""
from __future__ import annotations

import json
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .config import ARTIFACTS, DEMO_DIR, RISK_THRESHOLDS
from .db import Publisher, _clean, records
from .features.build import ACADEMIC_FEATURES, PLACEMENT_FEATURES
from .insights.llm import cache_rows
from .intelligence import Intelligence, run_intelligence
from .models.risk import level
from .pipeline import PipelineResult, StepLog, run_integration
from .scoring.score import component_scores, success_score

log = logging.getLogger("ascora.service")
STATE_FILE = ARTIFACTS / "state.joblib"


@dataclass
class RunState:
    run_id: str
    status: str = "running"            # running | done | error
    steps: list = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    error: str | None = None


RUNS: dict[str, RunState] = {}
_lock = threading.Lock()
STATE: dict = {}


def build_payload(res: PipelineResult, intel: Intelligence) -> dict[str, list[dict]]:
    s = res.students.rename(columns={"student_id": "id"})
    t = res.tables
    scores = intel.scores.reset_index(drop=True)
    return {
        "mentors": records(res.mentors),
        "students": records(s),
        "segments": records(intel.segments),
        "source_links": records(res.links[["student_id", "source", "raw_ref", "raw_value", "match_method", "match_confidence", "status"]]
                                .rename(columns={"raw_value": "raw_key"})),
        "academic": records(t["academic"]),
        "attendance": records(t["attendance"]),
        "lms_activity": records(t["lms_activity"]),
        "engagement": records(t["engagement"]),
        "placement": records(t["placement"]),
        "skills": records(t["skills"]),
        "feedback": records(t["feedback"]),
        "conflicts": records(res.conflicts) if len(res.conflicts) else [],
        "student_scores": records(scores),
        "insights": records(pd.DataFrame(intel.insights)),
        "analytics_artifacts": [{"key": k, "payload": _clean(v)} for k, v in intel.artifacts.items()],
        "data_quality_log": [{"run_id": res.run_id, "report": _clean(res.report)}],
        "raw_uploads": [{"file_name": v["file"], "source_type": k, "rows": v["rows_in"], "storage_path": None}
                        for k, v in res.report["sources"].items()],
        "llm_cache": cache_rows(),
    }


def save_state(intel: Intelligence):
    joblib.dump({"features": intel.features, "ref": intel.ref,
                 "academic": intel.models["academic"].calibrated, "placement": intel.models["placement"].calibrated},
                STATE_FILE, compress=3)
    STATE.update(joblib.load(STATE_FILE))


def load_state() -> bool:
    if STATE_FILE.exists():
        STATE.update(joblib.load(STATE_FILE))
        return True
    return False


def write_snapshot(payload: dict, path: Path):
    """Compact JSON snapshot for the web app's offline demo mode (no Supabase / no internet needed)."""
    keep = {k: payload[k] for k in ("students", "segments", "student_scores", "insights", "analytics_artifacts", "mentors",
                                    "data_quality_log", "conflicts", "raw_uploads", "academic", "attendance", "lms_activity",
                                    "engagement", "placement", "skills", "feedback", "source_links")}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(keep, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def run_all(folder: Path = DEMO_DIR, publish: bool = True, run: RunState | None = None,
            snapshot_path: Path | None = None) -> dict:
    def on_change(sl: StepLog):
        if run:
            run.steps = sl.as_list()

    sl = StepLog(on_change)
    if run:
        sl.run_id = run.run_id
    truth_dir = folder if (folder / "_truth.parquet").exists() else DEMO_DIR
    res = run_integration(folder, sl, truth_dir=truth_dir)
    intel = run_intelligence(res, sl, truth_dir)
    res.report["steps"] = sl.as_list()
    payload = build_payload(res, intel)
    save_state(intel)
    if snapshot_path:
        write_snapshot(payload, snapshot_path)
    counts = {}
    if publish:
        sl.start("publish")
        counts = Publisher().publish(payload)
        sl.done("publish", rows=counts)
    else:
        sl.skip("publish", "publish=false (local run)")
    res.report["steps"] = sl.as_list()
    summary = {"run_id": res.run_id, "students": len(res.students), "matching": res.report["matching"].get("fuzzy_overall"),
               "conflicts": len(res.conflicts), "published": counts,
               "academic_auc": intel.artifacts["model_academic"]["metrics"]["roc_auc"],
               "placement_auc": intel.artifacts["model_placement"]["metrics"]["roc_auc"]}
    if run:
        run.steps, run.summary, run.status = sl.as_list(), summary, "done"
    return summary


def start_run(folder: Path, publish: bool) -> RunState:
    import time
    import uuid
    rid = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
    st = RunState(run_id=rid)
    with _lock:
        RUNS[rid] = st

    def worker():
        try:
            run_all(folder, publish=publish, run=st)
        except Exception as e:  # surfaced to the UI, logged with traceback
            log.exception("pipeline run failed")
            st.status, st.error = "error", str(e)
    threading.Thread(target=worker, daemon=True).start()
    return st


# --------------------------------------------------------------------------- what-if

WHATIF_FEATURES = {"att_overall", "att_core", "completion_rate", "login_freq", "mocks", "soft_avg", "aptitude", "coding",
                   "certifications", "hackathons"}


def whatif_inputs(student_id: str) -> dict:
    if not STATE and not load_state():
        raise LookupError("no model state yet - run the pipeline first")
    f: pd.DataFrame = STATE["features"]
    if student_id not in f.index:
        raise KeyError(student_id)
    row = f.loc[student_id]
    vals = {k: (None if pd.isna(row[k]) else round(float(row[k]), 2)) for k in sorted(WHATIF_FEATURES)}
    if vals.get("mocks") is None:
        vals["mocks"] = 0.0
    return {"student_id": student_id, "values": vals}


def whatif(student_id: str, changes: dict[str, float]) -> dict:
    if not STATE and not load_state():
        raise LookupError("no model state yet - run the pipeline first")
    f: pd.DataFrame = STATE["features"]
    if student_id not in f.index:
        raise KeyError(student_id)
    bad = set(changes) - WHATIF_FEATURES
    if bad:
        raise ValueError(f"not actionable / not allowed: {sorted(bad)}")
    row = f.loc[[student_id]].copy()
    before = _eval(row)
    for k, v in changes.items():
        row[k] = float(v)
    after = _eval(row)
    return {"student_id": student_id, "changes": changes, "before": before, "after": after}


def _eval(row: pd.DataFrame) -> dict:
    comps = component_scores(row, STATE["ref"])
    score = float(success_score(comps).iat[0])
    pa = float(STATE["academic"].predict_proba(row[ACADEMIC_FEATURES].astype(float))[:, 1][0])
    out = {"success_score": round(score, 1), "components": {c: float(comps[c].iat[0]) for c in comps.columns},
           "academic_risk_prob": round(pa, 4), "academic_risk_level": str(level(np.array([pa]), "academic")[0])}
    if row["intent_declared"].iat[0] == "placement":
        pp = float(STATE["placement"].predict_proba(row[PLACEMENT_FEATURES].astype(float))[:, 1][0])
        out.update(placement_risk_prob=round(pp, 4), placement_risk_level=str(level(np.array([pp]), "placement")[0]))
    else:
        out.update(placement_risk_prob=None, placement_risk_level="N/A")
    out["thresholds"] = RISK_THRESHOLDS
    return out
