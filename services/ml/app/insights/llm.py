"""Optional LLM wording layer (Gemini Flash). Never used for scoring or risk.

Every call is cached by prompt hash (local JSON + llm_cache table), so the demo serves cached text
and the UI keeps working with the deterministic wording if the API is down or no key is set."""
from __future__ import annotations

import hashlib
import json
import logging

from ..config import ARTIFACTS, GEMINI_API_KEY

log = logging.getLogger("ascora.llm")
CACHE_FILE = ARTIFACTS / "llm_cache.json"
MODEL = "gemini-2.0-flash"


def _load() -> dict:
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


_cache = _load()


def cache_key(prompt: str) -> str:
    return hashlib.sha256(f"{MODEL}|{prompt}".encode()).hexdigest()[:32]


def generate(prompt: str, timeout_s: float = 12.0) -> str | None:
    key = cache_key(prompt)
    if key in _cache:
        return _cache[key]
    if not GEMINI_API_KEY:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY, http_options={"timeout": int(timeout_s * 1000)})
        resp = client.models.generate_content(model=MODEL, contents=prompt)
        text = (resp.text or "").strip()
    except Exception as e:  # network, quota, auth: fall back silently to deterministic text
        log.warning("LLM unavailable: %s", e)
        return None
    if text:
        _cache[key] = text
        CACHE_FILE.write_text(json.dumps(_cache, ensure_ascii=False, indent=1), encoding="utf-8")
    return text or None


def polish_insight(title: str, body: str) -> str:
    prompt = ("Rewrite this campus-analytics insight for a college Head of Department in at most 2 sentences. "
              "Keep every number exactly as given, do not add facts, no markdown.\n\n"
              f"Title: {title}\nInsight: {body}")
    return generate(prompt) or body


def cache_rows() -> list[dict]:
    return [dict(key=k, model=MODEL, output=v) for k, v in _cache.items()]
