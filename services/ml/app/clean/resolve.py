"""Entity resolution: link every source row to one canonical student, with a confidence.

Strategy per identifier type:
  roll number   -> normalise every format to CU{yy}{CODE}{seq} -> exact match       (conf 1.00)
  email only    -> name guessed from the local part, blocked by program (branch+batch),
                   fuzzy-matched against the roster                                   (conf = similarity x ambiguity)
  name only     -> blocked by branch + year, fuzzy-matched, initials handled         (conf = similarity x ambiguity)
Ambiguity: if the runner-up candidate is almost as good, confidence is capped into the review band.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache

import pandas as pd
from rapidfuzz import fuzz

from ..config import MATCH_AUTO, MATCH_REVIEW
from .normalize import email_name_guess, name_tokens, normalize_branch, normalize_name, normalize_roll


def batch_to_year(yy: int, academic_start: int = 2026) -> int:
    return academic_start - (2000 + yy) + 1


@dataclass
class Roster:
    df: pd.DataFrame                       # student_id, name, branch, year, batch
    blocks: dict[tuple[str, int], pd.DataFrame]

    @classmethod
    def from_frame(cls, df: pd.DataFrame) -> "Roster":
        blocks = {k: g for k, g in df.groupby(["branch", "year"])}
        return cls(df=df, blocks=blocks)


def status_for(conf: float) -> str:
    if conf >= MATCH_AUTO:
        return "auto"
    if conf >= MATCH_REVIEW:
        return "review"
    return "rejected"


@lru_cache(maxsize=200_000)
def name_similarity(query: str, candidate: str) -> float:
    """0..1 similarity between a (possibly messy) query name and a roster name."""
    q, c = normalize_name(query).lower(), candidate.lower()
    if not q:
        return 0.0
    qt, ct = name_tokens(q), name_tokens(c)
    # initials: "a. kumar" -> first initial must agree, surname carries the evidence
    if qt and len(qt[0]) == 1 and len(ct) >= 2:
        if qt[0] != ct[0][0]:
            return 0.0
        surname = " ".join(qt[1:])
        return 0.93 * fuzz.ratio(surname, " ".join(ct[1:])) / 100
    s1 = fuzz.token_sort_ratio(q, c)          # handles "Kumar Aarav" vs "Aarav Kumar"
    s2 = fuzz.ratio(q.replace(" ", ""), c.replace(" ", ""))  # handles "aaravkumar"
    s3 = fuzz.WRatio(q, c)
    return max(s1, s2, s3 * 0.97) / 100


def best_match(query: str, block: pd.DataFrame) -> tuple[str | None, float, float]:
    """Return (student_id, confidence, raw similarity) for a name query within a block."""
    if block is None or block.empty:
        return None, 0.0, 0.0
    sims = sorted(((name_similarity(query, n), sid) for sid, n in zip(block.student_id, block.name)), reverse=True)
    best_sim, best_id = sims[0]
    runner = sims[1][0] if len(sims) > 1 else 0.0
    conf = best_sim
    if best_sim - runner < 0.04:               # two near-identical candidates -> a human should decide
        conf = min(conf, MATCH_AUTO - 0.01)
    return best_id, round(conf, 3), round(best_sim, 3)


_PROGRAM = re.compile(r"B\.?\s*Tech\s+(?P<branch>.+?)\s+(?P<year>20\d{2})", re.I)


def parse_program(program: str) -> tuple[str | None, int | None]:
    m = _PROGRAM.search(str(program or ""))
    if not m:
        return None, None
    yy = int(m["year"]) - 2000
    return normalize_branch(m["branch"]), batch_to_year(yy)


def link_by_roll(df: pd.DataFrame, source: str, roster_ids: set[str]) -> pd.DataFrame:
    rows = []
    for raw, ref, key in zip(df["roll"], df["src_ref"], df["src_key"]):
        sid = normalize_roll(raw)
        if sid and sid in roster_ids:
            same_format = str(raw).strip().upper() == sid
            conf = 1.0 if same_format else 0.99
            method = "roll_exact" if same_format else "roll_normalised"
        else:
            conf, method, sid = 0.0, ("roll_unknown" if sid else "roll_missing"), None
        rows.append(dict(source=source, raw_ref=ref, raw_key=key, raw_value=str(raw), student_id=sid,
                         match_method=method, match_confidence=conf, status=status_for(conf)))
    return pd.DataFrame(rows)


def link_by_email(df: pd.DataFrame, source: str, roster: Roster) -> pd.DataFrame:
    """One decision per distinct (email, program); every row of that identity inherits it."""
    decisions = {}
    for (email, program), _ in df.groupby(["email", "program"], dropna=False):
        branch, year = parse_program(program)
        block = roster.blocks.get((branch, year))
        sid, conf, _sim = best_match(email_name_guess(str(email)), block)
        decisions[(email, program)] = (sid, conf)
    rows = []
    for email, program, ref in zip(df["email"], df["program"], df["src_ref"]):
        sid, conf = decisions[(email, program)]
        st = status_for(conf)
        rows.append(dict(source=source, raw_ref=ref, raw_key=email, raw_value=email,
                         student_id=sid if st != "rejected" else None,
                         match_method="email_name_block", match_confidence=conf, status=st))
    return pd.DataFrame(rows)


def link_by_name(df: pd.DataFrame, source: str, roster: Roster) -> pd.DataFrame:
    rows = []
    for name, branch, year, ref, key in zip(df["name"], df["branch"], df["year"], df["src_ref"], df["src_key"]):
        b = normalize_branch(branch)
        try:
            y = int(float(year))
        except (TypeError, ValueError):
            y = None
        block = roster.blocks.get((b, y))
        sid, conf, _ = best_match(str(name), block)
        st = status_for(conf)
        rows.append(dict(source=source, raw_ref=ref, raw_key=key, raw_value=str(name),
                         student_id=sid if st != "rejected" else None,
                         match_method="name_fuzzy_block", match_confidence=conf, status=st))
    return pd.DataFrame(rows)


def evaluate_links(links: pd.DataFrame, truth: pd.DataFrame, source: str, key_col: str = "raw_key",
                   exclude_keys: set | None = None) -> dict:
    """Precision / recall of entity resolution against the generator's hidden truth."""
    t = truth[truth.source == source].drop_duplicates("raw_ref").set_index("raw_ref").student_id
    lk = links[links.source == source].drop_duplicates(key_col).set_index(key_col)
    if exclude_keys:
        t = t[~t.index.isin(exclude_keys)]
    pred_auto = lk[lk.status == "auto"].student_id
    pred_any = lk[lk.status.isin(["auto", "review"])].student_id
    common_auto = pred_auto.index.intersection(t.index)
    correct_auto = int((pred_auto.loc[common_auto] == t.loc[common_auto]).sum())
    common_any = pred_any.index.intersection(t.index)
    correct_any = int((pred_any.loc[common_any] == t.loc[common_any]).sum())
    n_true = len(t)
    return {
        "identities": n_true,
        "auto_linked": int(len(common_auto)),
        "precision_auto": round(correct_auto / max(1, len(common_auto)), 4),
        "recall_auto": round(correct_auto / max(1, n_true), 4),
        "precision_incl_review": round(correct_any / max(1, len(common_any)), 4),
        "recall_incl_review": round(correct_any / max(1, n_true), 4),
        "review_queue": int((lk.status == "review").sum()),
    }
