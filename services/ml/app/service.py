"""End-to-end run: integration -> intelligence -> publish. Also keeps the in-memory state used by
the what-if simulator, and writes a JSON snapshot used by the web app's offline demo mode."""
from __future__ import annotations

import hashlib
import json
import logging
import os
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from .config import ARTIFACTS, CACHE_DIR, DEMO_DIR, RISK_THRESHOLDS
from .db import Publisher, _clean, records
from .features.build import ACADEMIC_FEATURES, PLACEMENT_FEATURES
from .insights.ask_index import build as build_ask_index
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
    started: float = field(default_factory=time.time)
    publishing: bool = False           # past the last checkpoint (writing rows / finishing): never declared stopped


RUNS: dict[str, RunState] = {}
_lock = threading.RLock()
RUNS_DIR = ARTIFACTS / "runs"   # run status survives restarts (App Service keeps this folder)
KEEP_RUNS = 50
# A run that parses, models and publishes for longer than this is stopped: a hostile or broken file must not hold the
# single run slot (and the UI spinner) forever. The demo cohort takes well under two minutes on the B1 plan.
RUN_TIMEOUT_S = int(os.getenv("ASCORA_RUN_TIMEOUT_S", "900"))
_worker: threading.Thread | None = None


class RunConflict(Exception):
    """A run is already in progress; two runs must never publish over each other."""


class RunStopped(Exception):
    """The run passed its time limit and was marked stopped; its worker must not change shared state."""


def expire(st: RunState, now: float | None = None) -> bool:
    """Mark a run that is over its time limit as stopped. Never while it is writing rows (the HTTP client has its own
    timeouts there), so a stopped run is always one that published nothing."""
    with _lock:
        if st.status != "running" or st.publishing or (now or time.time()) - st.started <= RUN_TIMEOUT_S:
            return False
        st.status, st.error = "error", f"Stopped after {RUN_TIMEOUT_S // 60} minutes without finishing. Nothing was published; check the files and run again."
        save_run(st)
    log.warning("run %s stopped by the time limit", st.run_id)
    return True


def _checkpoint(run: RunState | None) -> None:
    if run and run.status != "running":
        raise RunStopped(run.run_id)


def save_run(st: RunState) -> None:
    try:
        RUNS_DIR.mkdir(parents=True, exist_ok=True)
        tmp = RUNS_DIR / f".{st.run_id}.tmp"
        tmp.write_text(json.dumps({"run_id": st.run_id, "status": st.status, "steps": st.steps,
                                   "summary": st.summary, "error": st.error}, default=str))
        tmp.replace(RUNS_DIR / f"{st.run_id}.json")
        for old in sorted(RUNS_DIR.glob("*.json"))[:-KEEP_RUNS]:
            old.unlink(missing_ok=True)
    except OSError as e:
        log.warning("could not persist run %s: %s", st.run_id, e)


def load_runs() -> None:
    """On startup: restore recent runs. One that was still running died with the old process, so say so."""
    if not RUNS_DIR.is_dir():
        return
    for f in sorted(RUNS_DIR.glob("*.json")):
        try:
            d = json.loads(f.read_text())
        except (OSError, ValueError):
            continue
        st = RunState(run_id=d["run_id"], status=d.get("status", "error"), steps=d.get("steps", []),
                      summary=d.get("summary", {}), error=d.get("error"))
        if st.status == "running":
            st.status, st.error = "error", "Interrupted by a service restart. Start the run again."
            save_run(st)
        RUNS[st.run_id] = st


def get_run(run_id: str) -> RunState | None:
    st = RUNS.get(run_id)
    if st is None and RUNS_DIR.is_dir() and (RUNS_DIR / f"{run_id}.json").is_file():
        load_runs()
        st = RUNS.get(run_id)
    if st:
        expire(st)
    return st
STATE: dict = {}


def input_fingerprint(folder: Path) -> str:
    """Hash of every input file's bytes plus the pipeline code and dependency pins: a result is reusable only
    when neither the data nor the code changed."""
    h = hashlib.sha256()
    for f in sorted(folder.iterdir()):
        if f.is_file():
            h.update(f.name.encode())
            h.update(f.read_bytes())
    code = Path(__file__).resolve().parent
    for f in sorted(code.rglob("*.py")):
        h.update(f.read_bytes())
    req = code.parent / "requirements.txt"
    if req.exists():
        h.update(req.read_bytes())
    return h.hexdigest()[:24]


def _cache_path(fp: str) -> Path:
    return CACHE_DIR / f"run-{fp}.joblib"


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


def save_state(intel: Intelligence, ask_index: list | None = None):
    joblib.dump({"features": intel.features, "ref": intel.ref,
                 "academic": intel.models["academic"].calibrated, "placement": intel.models["placement"].calibrated,
                 "ask_index": ask_index or []},
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
            snapshot_path: Path | None = None, force: bool = False) -> dict:
    def on_change(sl: StepLog):
        if run:
            run.steps = sl.as_list()

    sl = StepLog(on_change)
    if run:
        sl.run_id = run.run_id
    fp = input_fingerprint(folder)
    cached = None if force else _load_cache(fp)
    if cached:
        payload, steps, summary_base, intel_state = cached
        # replay the recorded steps, clearly marked as reused, so the UI shows what the run consists of
        for st in steps:
            if st["key"] in sl.steps and st["key"] != "publish":
                sl.steps[st["key"]].status = "done"
                sl.steps[st["key"]].seconds = 0.0
                sl.steps[st["key"]].metrics = st["metrics"]
                sl.steps[st["key"]].detail = [*st["detail"][:2], f"Reused cached result (input and code unchanged, computed in {st['seconds']}s)"]
        sl._emit()
        STATE.update(intel_state)
    else:
        truth_dir = folder if (folder / "_truth.parquet").exists() else DEMO_DIR
        res = run_integration(folder, sl, truth_dir=truth_dir)
        _checkpoint(run)
        intel = run_intelligence(res, sl, truth_dir)
        _checkpoint(run)   # a stopped run must not replace the live model state
        res.report["steps"] = sl.as_list()
        payload = build_payload(res, intel)
        save_state(intel, build_ask_index(payload))
        summary_base = {"run_id": res.run_id, "students": len(res.students), "matching": res.report["matching"].get("fuzzy_overall"),
                        "conflicts": len(res.conflicts),
                        "academic_auc": intel.artifacts["model_academic"]["metrics"]["roc_auc"],
                        "placement_auc": intel.artifacts["model_placement"]["metrics"]["roc_auc"]}
        _save_cache(fp, payload, sl.as_list(), summary_base, {k: STATE[k] for k in ("features", "ref", "academic", "placement", "ask_index")})
    if snapshot_path:
        write_snapshot(payload, snapshot_path)
    counts = {}
    with _lock:   # decide atomically: either the time limit stopped the run, or it finishes (and publishes) in full
        _checkpoint(run)
        if run:
            run.publishing = True   # past the last checkpoint: from here the run finishes, it is never stopped half-way
    if publish:
        sl.start("publish")
        counts = Publisher().publish(payload)
        sl.done("publish", rows=counts)
    else:
        sl.skip("publish", "publish=false (local run)")
    summary = {**summary_base, "published": counts, "cache": "hit" if cached else "miss", "fingerprint": fp}
    if run:
        run.steps, run.summary, run.status = sl.as_list(), summary, "done"
    return summary


def _load_cache(fp: str):
    f = _cache_path(fp)
    if not f.exists():
        return None
    try:
        return joblib.load(f)
    except Exception:  # corrupt or from an incompatible library version: recompute
        log.warning("cache unreadable, recomputing")
        return None


def _save_cache(fp: str, payload, steps, summary_base, state):
    try:
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
        for old in CACHE_DIR.glob("run-*.joblib"):
            old.unlink(missing_ok=True)  # keep only the latest
        joblib.dump((payload, steps, summary_base, state), _cache_path(fp), compress=3)
    except OSError as e:
        log.warning("could not write cache: %s", e)


def start_run(folder: Path, publish: bool) -> RunState:
    global _worker
    import uuid
    rid = time.strftime("%Y%m%d-%H%M%S-") + uuid.uuid4().hex[:6]
    st = RunState(run_id=rid)
    with _lock:
        for r in RUNS.values():
            expire(r)
        busy = next((r for r in RUNS.values() if r.status == "running"), None)
        if busy:
            raise RunConflict(busy.run_id)
        if _worker is not None and _worker.is_alive():   # a stopped run's thread is still unwinding
            raise RunConflict("(previous run still stopping)")
        RUNS[rid] = st
    save_run(st)

    def worker():
        try:
            run_all(folder, publish=publish, run=st)
        except RunStopped:
            log.info("run %s exited after being stopped", st.run_id)
        except Exception as e:  # surfaced to the UI, logged with traceback
            log.exception("pipeline run failed")
            st.status, st.error = "error", str(e)
        finally:
            if st.status == "running":   # never report success that was not recorded
                st.status, st.error = "error", "The run ended without reporting a result."
            st.summary = {**(st.summary or {}), "finished_at": time.time()}
            save_run(st)
    _worker = threading.Thread(target=worker, daemon=True)
    _worker.start()
    # flip the status even if nobody polls; expire() re-checks the limit and the publishing flag
    timer = threading.Timer(RUN_TIMEOUT_S + 1, lambda: expire(st))
    timer.daemon = True
    timer.start()
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
