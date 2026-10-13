"""Dev check: run the integration stage on the demo set and print step metrics + matching accuracy."""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import DEMO_DIR  # noqa: E402
from app.pipeline import StepLog, run_integration  # noqa: E402

t = time.time()
log = StepLog()
r = run_integration(DEMO_DIR, log, truth_dir=DEMO_DIR)
print("seconds", round(time.time() - t, 1))
for s in log.as_list():
    if s["status"] != "pending":
        print(s["key"], s["status"], s["seconds"], json.dumps(s["metrics"], default=str)[:500])
print(json.dumps(r.report["matching"].get("evaluation_vs_truth"), indent=1))
print("fuzzy overall", json.dumps(r.report["matching"].get("fuzzy_overall")))
print(json.dumps(r.report["quality"], default=str)[:1500])
