"""Run the full pipeline on the frozen demo set and publish to Supabase.

Usage:  python scripts/publish_demo.py [--no-publish]"""
import json
import sys
import time
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import ARTIFACTS, DEMO_DIR, ROOT  # noqa: E402
from app.service import run_all  # noqa: E402

# publishing replaces live pipeline rows, so anything other than the one known flag stops here instead of publishing
unknown = [a for a in sys.argv[1:] if a != "--no-publish"]
if unknown:
    print(__doc__)
    sys.exit(f"unknown argument(s): {' '.join(unknown)}; nothing was run")

t = time.time()
summary = run_all(DEMO_DIR, publish="--no-publish" not in sys.argv,
                  snapshot_path=ROOT / "apps" / "web" / "demo-data" / "snapshot.json")
print(json.dumps(summary, indent=1, default=str))
print(f"done in {time.time() - t:.1f}s; state -> {ARTIFACTS / 'state.joblib'}")
