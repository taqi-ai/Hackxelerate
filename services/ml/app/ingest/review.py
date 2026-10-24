"""Mapping review for unfamiliar exports: show what the auto-mapper decided and how sure it is, so an admin can
confirm or correct it before anything is imported. Pure functions; nothing is read from or written to the database.

Confidence tiers: exact synonym = confident; fuzzy match = uncertain (needs a human look, alternatives listed);
no match = unmapped. A fuzzy match is never silently treated as certain."""
from __future__ import annotations

from rapidfuzz import fuzz, process

from .schema import REQUIRED, SCHEMAS, _norm, detect_source, map_headers

MAX_HEADERS = 200
MAX_HEADER_LEN = 200


def _clean(headers: list) -> list[str]:
    if not isinstance(headers, list) or not headers:
        raise ValueError("headers must be a non-empty list")
    if len(headers) > MAX_HEADERS:
        raise ValueError(f"at most {MAX_HEADERS} columns")
    out = []
    for h in headers:
        s = str(h).strip()
        if not s or len(s) > MAX_HEADER_LEN:
            raise ValueError("a header is empty or too long")
        out.append(s)
    if len({_norm(h) for h in out}) != len(out):
        raise ValueError("duplicate column names; rename them in the source file")
    return out


def _check_source(source_type: str) -> str:
    if source_type not in SCHEMAS:
        raise ValueError(f"unsupported source type; choose one of {sorted(SCHEMAS)}")
    return source_type


def _alternatives(header: str, source_type: str, k: int = 3) -> list[dict]:
    schema = SCHEMAS[source_type]
    lookup = {syn: canon for canon, syns in schema.items() for syn in syns}
    seen, alts = set(), []
    for syn, score, _ in process.extract(_norm(header), list(lookup), scorer=fuzz.token_set_ratio, limit=12):
        canon = lookup[syn]
        if canon not in seen and score >= 50:
            seen.add(canon)
            alts.append({"field": canon, "score": round(float(score))})
        if len(alts) == k:
            break
    return alts


def suggest(headers: list, source_type: str | None = None) -> dict:
    """Suggested mapping with a confidence tier per column. source_type=None detects the best-fitting source."""
    hs = _clean(headers)
    m = detect_source(hs) if source_type is None else map_headers(hs, _check_source(source_type))
    st = m.source_type
    columns = []
    for h in hs:
        if h in m.columns:
            canon = m.columns[h]
            method = m.method[canon]
            tier = "confident" if method == "exact" else "uncertain"
            columns.append({"header": h, "field": canon, "tier": tier, "method": method,
                            "alternatives": [] if tier == "confident" else _alternatives(h, st)})
        else:
            columns.append({"header": h, "field": None, "tier": "unmapped", "method": None,
                            "alternatives": _alternatives(h, st)})
    mapped = {c["field"] for c in columns if c["field"]}
    missing = sorted(REQUIRED[st] - mapped)
    return {"source_type": st, "detected": source_type is None, "columns": columns,
            "missing_required": missing,
            "needs_review": bool(missing) or any(c["tier"] == "uncertain" for c in columns),
            "can_import": not missing}


def apply_overrides(headers: list, source_type: str, overrides: dict) -> dict:
    """Admin decisions: {header: canonical field, or None to ignore the column}. Validated, not trusted: unknown
    headers or fields are refused, and two columns may not claim the same field."""
    st = _check_source(source_type)
    hs = _clean(headers)
    base = suggest(hs, st)
    chosen = {c["header"]: c["field"] for c in base["columns"]}
    for h, field in overrides.items():
        if h not in chosen:
            raise ValueError(f"unknown column: {str(h)[:60]}")
        if field is not None and field not in SCHEMAS[st]:
            raise ValueError(f"unknown field for {st}: {str(field)[:60]}")
        chosen[h] = field
    claimed: dict[str, str] = {}
    for h, field in chosen.items():
        if field is None:
            continue
        if field in claimed:
            raise ValueError(f"'{claimed[field]}' and '{h}' are both mapped to '{field}'")
        claimed[field] = h
    missing = sorted(REQUIRED[st] - set(claimed))
    return {"source_type": st, "columns": {h: f for h, f in chosen.items() if f},
            "ignored": [h for h, f in chosen.items() if not f],
            "missing_required": missing, "can_import": not missing}


def preview(rows: list, mapping: dict, limit: int = 5) -> list[dict]:
    """First rows as they will look after mapping, so wrong-column errors show before publishing.
    Empty cells stay None: missing is never turned into zero."""
    out = []
    for r in rows[:limit]:
        out.append({field: (None if r.get(h) in (None, "") else r.get(h)) for h, field in mapping.items()})
    return out
