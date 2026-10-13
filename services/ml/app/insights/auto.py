"""Cross-source insights that only exist because the data was joined.

Numbers are computed here, deterministically. An LLM may optionally rephrase the sentence
(insights/llm.py); the numbers it is given are never changed and the deterministic text is the fallback."""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def _pct(x: float) -> str:
    return f"{100 * x:.0f}%"


def compute(f: pd.DataFrame, comps: pd.DataFrame, scores: pd.DataFrame, students: pd.DataFrame,
            tables: dict[str, pd.DataFrame], y_acad: pd.Series | None) -> list[dict]:
    ins: list[dict] = []
    s = students.set_index("student_id")
    df = f.join(comps.add_prefix("c_")).join(scores).join(s[["section", "branch"]], rsuffix="_s")

    # 1. hackathon-active but LMS-disengaged -> placement readiness
    grp = (df["hackathons"] >= 2) & (df["completion_rate"] < 60)
    ref = (df["hackathons"] >= 2) & (df["completion_rate"] >= 60)
    if grp.sum() >= 10 and ref.sum() >= 10:
        a, b = df.loc[grp, "c_placement"].mean(), df.loc[ref, "c_placement"].mean()
        ins.append(dict(kind="cross_source", severity="warning", rank=1,
                        title="Hackathon enthusiasm doesn't replace coursework",
                        body=f"Students with 2+ hackathons but under 60% assignment completion ({int(grp.sum())} students) have "
                             f"{(b - a) / b:.0%} lower placement readiness than equally active peers who keep up with assignments "
                             f"({a:.0f} vs {b:.0f}).",
                        metric=dict(group=int(grp.sum()), comparison=int(ref.sum()), readiness_group=round(a, 1), readiness_comparison=round(b, 1),
                                    sources=["clubs_events", "lms_activity_log", "placement_cell"])))

    # 2. gatekeeper course: which past subject's score best predicts this semester's academic risk?
    if y_acad is not None:
        acad = tables["academic"].set_index("student_id")
        rows = []
        for sid, subs in acad["subjects"].items():
            if sid not in y_acad.index or not isinstance(subs, list):
                continue
            cur = max(x["sem"] for x in subs)
            for x in subs:
                if x["sem"] < cur and x["total"] is not None:
                    rows.append((x["subject"], sid, x["total"]))
        m = pd.DataFrame(rows, columns=["subject", "sid", "total"])
        res = []
        for subj, g in m.groupby("subject"):
            if len(g) < 150:
                continue
            yy = y_acad.reindex(g.sid).astype(int).to_numpy()
            if yy.min() == yy.max():
                continue
            res.append((roc_auc_score(yy, -g.total.to_numpy()), subj, len(g)))
        res.sort(reverse=True)
        if res:
            auc, subj, n = res[0]
            runner = ", ".join(r[1] for r in res[1:3])
            ins.append(dict(kind="gatekeeper", severity="warning", rank=2,
                            title=f"{subj} is the strongest early signal of academic trouble",
                            body=f"Among {n} students who took it, their {subj} score alone separates students now at academic risk "
                                 f"with AUC {auc:.2f}, ahead of {runner}. A correlation, not proof of cause, but a sensible place to target early support.",
                            metric=dict(subject=subj, auc=round(float(auc), 3), n=int(n),
                                        ranking=[dict(subject=r[1], auc=round(float(r[0]), 3)) for r in res[:6]],
                                        sources=["erp_academics"])))

    # 3. section-level post-mid-sem drop
    att = tables["attendance"].set_index("student_id")["by_month"]
    sep = att.map(lambda d: d.get("Sep") if isinstance(d, dict) else np.nan)
    octo = att.map(lambda d: d.get("Oct") if isinstance(d, dict) else np.nan)
    drop = (octo - sep).rename("drop")
    sec = s[["branch", "year", "section"]].join(drop).join(df["lms_ratio"])
    by = sec.groupby(["branch", "year", "section"]).agg(drop=("drop", "mean"), lms=("lms_ratio", "mean"), n=("drop", "size"))
    by = by[by.n >= 25].sort_values("drop")
    if len(by):
        (br, yr, sc), r = next(by.iterrows())
        cohort = sec["drop"].mean()
        ins.append(dict(kind="cohort_trend", severity="warning", rank=3,
                        title=f"{br} Year {yr} Section {sc} slipped after mid-sem",
                        body=f"Attendance in {br} Y{yr}-{sc} fell {abs(r['drop']):.1f} pts from September to October "
                             f"(campus average change {cohort:+.1f} pts) and LMS activity is at {r['lms']:.0%} of its early-semester level. "
                             f"Worth a quick conversation with the section's faculty.",
                        metric=dict(section=f"{br} Y{yr}-{sc}", drop_pts=round(float(r["drop"]), 1), campus_change=round(float(cohort), 1),
                                    n=int(r["n"]), sources=["attendance_register", "lms_activity_log"])))

    # 4. silent decliners
    sd = scores["alerts"].map(lambda a: any(x["type"] == "silent_decliner" for x in a))
    if sd.sum():
        avg = scores.loc[sd, "success_score"].mean()
        ins.append(dict(kind="silent_decliner", severity="critical", rank=0,
                        title=f"{int(sd.sum())} silent decliners hidden behind average scores",
                        body=f"{int(sd.sum())} students have an average Success Score ({avg:.0f}) yet their LMS activity has fallen "
                             f"sharply since early semester and their internals are below their own past level. "
                             f"A dashboard of current marks alone would not flag them.",
                        metric=dict(count=int(sd.sum()), avg_score=round(float(avg), 1), sources=["lms_activity_log", "erp_academics"])))

    # 5. high CGPA, high placement risk
    hp = (df["cgpa"] >= 8) & (scores["placement_risk_level"] == "High")
    pi = (df["cgpa"] >= 8) & (scores["placement_risk_level"].isin(["Low", "Medium", "High"]))
    if pi.sum() >= 20 and hp.sum():
        g = df[hp]
        no_mock = (g["mocks"].fillna(0) == 0).mean()
        ins.append(dict(kind="cross_source", severity="warning", rank=4,
                        title="A good CGPA is not placement readiness",
                        body=f"{_pct(hp.sum() / pi.sum())} of placement-track students with CGPA 8+ ({int(hp.sum())} students) are at high "
                             f"placement risk. {_pct(no_mock)} of them have not attended a single mock interview, and their soft-skill "
                             f"average is {g['soft_avg'].mean():.0f} vs {df['soft_avg'].mean():.0f} campus-wide.",
                        metric=dict(count=int(hp.sum()), share=round(float(hp.sum() / pi.sum()), 3), no_mock_share=round(float(no_mock), 3),
                                    sources=["erp_academics", "placement_cell", "skills_assessment"])))

    # 6. attendance vs academic risk (quantified)
    lo = df["att_core"] < 65
    if lo.sum() >= 20:
        r_lo = (scores.loc[lo, "academic_risk_level"] == "High").mean()
        r_hi = (scores.loc[~lo, "academic_risk_level"] == "High").mean()
        ins.append(dict(kind="cross_source", severity="info", rank=5,
                        title="Core-lab attendance is a clear risk lever",
                        body=f"Students under 65% core-subject attendance are {r_lo / max(r_hi, 1e-6):.1f}x as likely to be at high academic "
                             f"risk ({_pct(r_lo)} vs {_pct(r_hi)}). It's one of the few drivers a mentor can act on this week.",
                        metric=dict(low_att=int(lo.sum()), high_risk_low_att=round(float(r_lo), 3), high_risk_others=round(float(r_hi), 3),
                                    sources=["attendance_register", "erp_academics"])))

    # 7. feedback themes
    fb = tables["feedback"]
    neg = fb[fb.sentiment == "negative"]
    if len(neg) >= 20:
        top = neg.theme.value_counts()
        course = neg.groupby("course").size().sort_values(ascending=False)
        ins.append(dict(kind="feedback", severity="info", rank=6,
                        title=f"Top student concern: {top.index[0]}",
                        body=f"{_pct(top.iat[0] / len(neg))} of negative feedback ({len(neg)} comments in English, Hindi and Hinglish) "
                             f"is about {top.index[0]}. Most-mentioned course: {course.index[0]}. Feedback is context only and never lowers a "
                             f"student's score.",
                        metric=dict(themes=top.head(5).to_dict(), course=course.index[0], n=int(len(neg)), sources=["feedback_forms"])))
    return sorted(ins, key=lambda d: d["rank"])
