"""Central configuration: paths, score weights, risk thresholds, matching thresholds.

Everything a judge might ask "why this number?" about lives here, in one place."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]          # repo root
ML_ROOT = Path(__file__).resolve().parents[1]       # services/ml
load_dotenv(ML_ROOT / ".env")

DEMO_DIR = ROOT / "data" / "demo"
RAW_DIR = ROOT / "data" / "raw"
ARTIFACTS = ML_ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
os.environ.setdefault("LOKY_MAX_CPU_COUNT", "4")  # silences a joblib core-count probe on Windows

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
INGEST_TOKEN = os.getenv("ASCORA_INGEST_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
TOKEN_SECRET = os.getenv("ASCORA_TOKEN_SECRET", "")
# One analytics deployment serves one institution (its models and runs are that institution's); the database is shared.
INSTITUTION_ID = os.getenv("ASCORA_INSTITUTION_ID", "00000000-0000-4000-8000-0000000000a1")
CACHE_DIR = Path(os.getenv("ASCORA_CACHE_DIR", str(ML_ROOT / "artifacts" / "cache")))
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT", "")
AZURE_OPENAI_KEY = os.getenv("AZURE_OPENAI_KEY", "")
AZURE_OPENAI_DEPLOYMENT = os.getenv("AZURE_OPENAI_DEPLOYMENT", "ascora-chat")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",") if o.strip()]

# --- Student Success Score: component weights (sum to 1.0) -------------------------------
SCORE_WEIGHTS = {
    "academic": 0.30,
    "placement": 0.20,
    "attendance": 0.15,
    "lms": 0.15,
    "skills": 0.10,
    "engagement": 0.10,
}
BACKLOG_PENALTY = 8.0          # points per active backlog, capped below
BACKLOG_PENALTY_CAP = 24.0
NO_PLACEMENT_DATA_SCORE = 15.0  # readiness when a student never visited the placement cell

# --- Risk levels: calibrated probability cut-offs -----------------------------------------
RISK_THRESHOLDS = {"academic": (0.25, 0.50), "placement": (0.35, 0.60)}  # (medium_from, high_from)

# --- Entity resolution --------------------------------------------------------------------
MATCH_AUTO = 0.90     # auto-accept at or above
MATCH_REVIEW = 0.75   # grey zone [review, auto) -> "needs review"; below -> rejected

# --- Conflict resolution rules (source of truth per attribute) ----------------------------
CONFLICT_RULES = {
    "attendance_pct": ("attendance_register", "The register is the source of truth for attendance (ERP copies it weekly)."),
    "branch": ("majority", "Majority vote across ERP, placement cell, LMS program and clubs records."),
    "name": ("erp_academics", "ERP holds the legal name from admission records."),
}
ATTENDANCE_CONFLICT_PTS = 5.0

CURRENT_WEEK = 12
MIDSEM_WEEK = 8
