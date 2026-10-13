"""Publish pipeline outputs to Supabase through the token-protected `ascora_ingest` RPC.

The ML service never holds the Supabase service-role key: it authenticates with a dedicated ingest
secret whose SHA-256 is stored in a private schema, and the RPC only accepts whitelisted tables."""
from __future__ import annotations

import json
import logging
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime

import httpx
import numpy as np
import pandas as pd

from .config import INGEST_TOKEN, SUPABASE_ANON_KEY, SUPABASE_URL

log = logging.getLogger("ascora.db")

# parent tables first (foreign keys)
PUBLISH_ORDER = ["mentors", "students", "segments", "source_links", "academic", "attendance", "lms_activity", "engagement",
                 "placement", "skills", "feedback", "conflicts", "student_scores", "insights", "analytics_artifacts",
                 "data_quality_log", "raw_uploads", "llm_cache"]


def _clean(v):
    if v is None:
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        # pandas turns int columns with nulls into floats; 4.0 -> 4 keeps smallint columns happy
        return int(f) if f.is_integer() and abs(f) < 2**53 else f
    if isinstance(v, (np.bool_,)):
        return bool(v)
    if isinstance(v, (datetime, date, pd.Timestamp)):
        return v.isoformat()
    if isinstance(v, dict):
        return {str(k): _clean(x) for k, x in v.items()}
    if isinstance(v, (list, tuple, np.ndarray)):
        return [_clean(x) for x in v]
    if v is pd.NA:
        return None
    return v


def records(df: pd.DataFrame) -> list[dict]:
    return [{k: _clean(v) for k, v in row.items()} for row in df.to_dict(orient="records")]


class Publisher:
    def __init__(self):
        if not (SUPABASE_URL and SUPABASE_ANON_KEY and INGEST_TOKEN):
            raise RuntimeError("SUPABASE_URL, SUPABASE_ANON_KEY and ASCORA_INGEST_TOKEN must be set in services/ml/.env")
        self.client = httpx.Client(base_url=f"{SUPABASE_URL}/rest/v1", timeout=httpx.Timeout(90.0, pool=300.0),
                                   limits=httpx.Limits(max_connections=4, max_keepalive_connections=4),
                                   headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"})

    def _rpc(self, fn: str, payload: dict):
        r = self.client.post(f"/rpc/{fn}", content=json.dumps(payload, ensure_ascii=False))
        if r.status_code >= 300:
            raise RuntimeError(f"{fn} failed ({r.status_code}): {r.text[:400]}")
        return r.json() if r.content else None

    def reset(self, keep_interventions: bool = True):
        self._rpc("ascora_reset", {"p_token": INGEST_TOKEN, "p_keep_interventions": keep_interventions})

    @staticmethod
    def _chunks(rows: list[dict], max_rows: int = 800, max_bytes: int = 900_000) -> list[list[dict]]:
        """Batch by payload size, not just row count: a student_scores row carries full SHAP JSON (several KB)."""
        out, cur, size = [], [], 0
        for r in rows:
            n = len(json.dumps(r, ensure_ascii=False))
            if cur and (len(cur) >= max_rows or size + n > max_bytes):
                out.append(cur)
                cur, size = [], 0
            cur.append(r)
            size += n
        if cur:
            out.append(cur)
        return out

    def insert(self, table: str, rows: list[dict]) -> int:
        chunks = self._chunks(rows)
        if not chunks:
            return 0

        def one(chunk):
            return self._rpc("ascora_ingest", {"p_token": INGEST_TOKEN, "p_table": table, "p_rows": chunk}) or 0
        with ThreadPoolExecutor(max_workers=4) as pool:  # batches of one table are independent rows
            return sum(pool.map(one, chunks))

    def publish(self, payload: dict[str, list[dict]], progress=None) -> dict:
        self.reset()
        counts = {}
        # parent tables first (foreign keys); each stage's tables are independent of each other
        stages = [["mentors"], ["students", "segments"],
                  ["source_links", "academic", "attendance", "lms_activity", "engagement", "placement", "skills", "feedback", "conflicts"],
                  ["student_scores", "insights", "analytics_artifacts", "data_quality_log", "raw_uploads", "llm_cache"]]
        for stage in stages:
            todo = [tb for tb in stage if tb in payload]
            with ThreadPoolExecutor(max_workers=min(4, len(todo) or 1)) as pool:
                for tb, n in zip(todo, pool.map(lambda tb: self.insert(tb, payload[tb]), todo)):
                    counts[tb] = n
                    if progress:
                        progress(tb, n)
        return counts
