"""Optional LLM wording layer. Never used for scoring or risk.

Provider order: Azure OpenAI (gpt-4.1-mini, student credit) -> Gemini -> none.
Every call is cached by prompt hash (local JSON + llm_cache table), so the demo serves cached text and the
UI keeps working with deterministic wording if no provider is configured or the API is down."""
from __future__ import annotations

import hashlib
import json
import logging
import re

import httpx

from ..config import AZURE_OPENAI_DEPLOYMENT, AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, ARTIFACTS, GEMINI_API_KEY

log = logging.getLogger("ascora.llm")
CACHE_FILE = ARTIFACTS / "llm_cache.json"
GEMINI_MODEL = "gemini-2.0-flash"
API_VERSION = "2024-10-21"


def provider() -> str:
    if AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_KEY:
        return "azure-openai"
    if GEMINI_API_KEY:
        return "gemini"
    return "none"


def model_name() -> str:
    return {"azure-openai": AZURE_OPENAI_DEPLOYMENT, "gemini": GEMINI_MODEL}.get(provider(), "none")


def _load() -> dict:
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


_cache = _load()


def cache_key(prompt: str, json_mode: bool) -> str:
    return hashlib.sha256(f"{model_name()}|{json_mode}|{prompt}".encode()).hexdigest()[:32]


def _azure(prompt: str, json_mode: bool, timeout_s: float) -> str | None:
    url = f"{AZURE_OPENAI_ENDPOINT.rstrip('/')}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT}/chat/completions"
    body: dict = {
        "messages": [
            {"role": "system", "content": "You are a precise assistant inside a college analytics product. Follow the user's format exactly."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 600,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    r = httpx.post(url, params={"api-version": API_VERSION}, headers={"api-key": AZURE_OPENAI_KEY}, json=body, timeout=timeout_s)
    r.raise_for_status()
    return (r.json()["choices"][0]["message"]["content"] or "").strip()


def _gemini(prompt: str, timeout_s: float) -> str | None:
    from google import genai
    client = genai.Client(api_key=GEMINI_API_KEY, http_options={"timeout": int(timeout_s * 1000)})
    return ((client.models.generate_content(model=GEMINI_MODEL, contents=prompt).text) or "").strip()


_ROLL = re.compile(r"\bCU\d{2}[A-Z]{2,4}\d{4}\b", re.IGNORECASE)
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b")
_PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)")


def redact(text: str) -> str:
    """Strip student identifiers before text leaves for an external model: roll numbers, emails, phone numbers.
    Free-text names cannot be detected reliably by pattern; the prompts built here never include them, but a
    staff member could still type one into Ask, which is documented in docs/engineering/THREAT_MODEL.md (T8)."""
    return _PHONE.sub("[phone]", _EMAIL.sub("[email]", _ROLL.sub("[student-id]", text)))


def generate(prompt: str, json_mode: bool = False, timeout_s: float = 12.0) -> str | None:
    prompt = redact(prompt)   # single choke point: every external LLM call goes through here
    key = cache_key(prompt, json_mode)
    if key in _cache:
        return _cache[key]
    prov = provider()
    if prov == "none":
        return None
    try:
        text = _azure(prompt, json_mode, timeout_s) if prov == "azure-openai" else _gemini(prompt, timeout_s)
    except Exception as e:  # network, quota, auth: fall back silently to deterministic text
        log.warning("LLM unavailable (%s): %s", prov, e)
        return None
    if text:
        _cache[key] = text
        try:
            CACHE_FILE.write_text(json.dumps(_cache, ensure_ascii=False, indent=1), encoding="utf-8")
        except OSError:
            pass  # read-only filesystem is fine: the cache is an optimisation
    return text or None


def polish_insight(title: str, body: str) -> str:
    prompt = ("Rewrite this campus-analytics insight for a college Head of Department in at most 2 sentences. "
              "Keep every number exactly as given, do not add facts, no markdown, no em-dashes.\n\n"
              f"Title: {title}\nInsight: {body}")
    out = generate(prompt)
    # safety: the rewrite must keep every number from the original, otherwise use the deterministic text
    if out:
        import re
        nums = set(re.findall(r"\d+(?:\.\d+)?", body))
        if all(n in out for n in nums):
            return out
    return body


def cache_rows() -> list[dict]:
    return [dict(key=k, model=model_name(), output=v) for k, v in _cache.items()]
