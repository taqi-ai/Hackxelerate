"""Dev check: integration + intelligence on the demo set; prints step metrics, model metrics and personas."""
import json
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import DEMO_DIR  # noqa: E402
from app.intelligence import run_intelligence  # noqa: E402
from app.pipeline import StepLog, run_integration  # noqa: E402

t = time.time()
log = StepLog()
res = run_integration(DEMO_DIR, log, truth_dir=DEMO_DIR)
intel = run_intelligence(res, log, DEMO_DIR)
print("total seconds", round(time.time() - t, 1))
for s in log.as_list():
    if s["status"] != "pending":
        print(f"{s['key']:12} {s['status']:7} {s['seconds']}s  {json.dumps(s['metrics'], default=str)[:300]}")
for k in ("model_academic", "model_placement"):
    m = intel.artifacts[k]["metrics"]
    print(k, {x: m[x] for x in ("roc_auc", "pr_auc", "cv_roc_auc_mean", "recall_at_high", "precision_at_high", "precision_at_k", "precision_at_k_baseline", "baseline_logreg")})
    print("  top features:", [i["label"] for i in intel.artifacts[k]["importance"][:6]])
print(intel.segments[["id", "persona", "size", "traits"]].to_string())
print("levels:", intel.scores.academic_risk_level.value_counts().to_dict(), intel.scores.placement_risk_level.value_counts().to_dict())
print("sensitivity min spearman", intel.artifacts["sensitivity"]["min_spearman"])
print("early curve", intel.artifacts["early_curve"]["points"])
print("fairness academic", [(a["attribute"], a["flag_rate_ratio"], a["fnr_gap"], a["status"]) for a in intel.artifacts["fairness_academic"]["attributes"]])
print("what works", intel.artifacts["what_works"]["rows"][:3])
for i in intel.insights:
    print("-", i["title"], "|", i["body"][:160])
ex = intel.scores[intel.scores.academic_risk_level == "High"].iloc[0]
print(json.dumps({k: ex[k] for k in ("student_id", "success_score", "persona", "alerts", "recourse")}, default=str, indent=1)[:1500])
print(json.dumps(ex["shap_academic"], indent=1)[:900])
