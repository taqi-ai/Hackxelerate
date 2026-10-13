"""Segmentation: KMeans on standardised component scores + trends, k chosen by silhouette,
clusters named from their centroids by a transparent rule layer."""
from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

SEG_COLS = ["academic", "placement", "attendance", "lms", "skills", "engagement", "lms_slope", "att_trend", "internal_delta"]

PERSONAS = {
    "All-round strong": dict(
        description="Strong across academics, readiness, attendance and engagement.",
        action="Invite as peer mentors and peer tutors; nominate for hackathons and advanced electives."),
    "High academics, low placement readiness": dict(
        description="Good grades, but few mock interviews, weaker soft skills or low aptitude/coding practice.",
        action="Placement cell: mock interview series + communication workshop; set a 4-week coding practice plan."),
    "Silent decliners": dict(
        description="Look average on paper today, but LMS activity, attendance and internals are trending down.",
        action="Mentor check-in this week (low-key, non-judgemental); review workload and any non-academic barriers."),
    "Engaged but academically slipping": dict(
        description="Very active in clubs, events and hackathons while internals and assignment completion are dropping.",
        action="Mentor conversation on balancing commitments; peer tutoring in the weakest subject; time-planning support."),
    "Engaged but not placement-ready": dict(
        description="Regular in class, active on the LMS and in campus life, but aptitude, coding and mock-interview practice lag behind.",
        action="Channel the energy: placement-cell bootcamp, weekly coding contest, and two mock interviews this month."),
    "Backlog cluster": dict(
        description="Active backlogs and low current internals; highest near-term academic risk.",
        action="Remedial classes + peer tutoring for backlog subjects; supplementary-exam plan; fortnightly mentor review."),
    "Disengaged": dict(
        description="Low LMS activity, low attendance and little co-curricular involvement.",
        action="Early outreach by mentor; counselling referral if appropriate; parent call only with the student's consent."),
    "Steady middle": dict(
        description="Around the cohort average on most indicators with no strong trend.",
        action="Standard mentoring cadence; nudge towards one skill-building activity per month."),
}


def persona_fit(c: dict) -> dict[str, float]:
    """Score how well a cluster centroid (component scores 0-100 + raw trends) fits each persona."""
    a, p, at, l, s, e = (c[k] for k in ("academic", "placement", "attendance", "lms", "skills", "engagement"))
    down = -(c["lms_slope"] * 25) - c["att_trend"] - c["internal_delta"]          # bigger = more decline
    return {
        "All-round strong": min(a, p, at, l, s, e) - 40,
        # both conditions must hold (min), so a mediocre-academics cluster can't win on low placement alone
        "High academics, low placement readiness": 3 * min(a - 52, 48 - p),
        "Silent decliners": down * 1.6 + (25 - abs(a - 50)) * 0.5,
        "Engaged but academically slipping": (e - 60) + 2 * max(0, -c["internal_delta"] - 3) + (50 - a) * 0.5,
        "Engaged but not placement-ready": (min(e, l) - 60) + (45 - p),
        "Backlog cluster": (35 - a) * 1.5 + (45 - at) * 0.3,
        "Disengaged": (40 - l) + (40 - at) + (40 - e) * 0.5,
        "Steady middle": 15 - np.mean([abs(v - 50) for v in (a, p, at, l, s, e)]),
    }


def segment(frame: pd.DataFrame, k_range=range(6, 8), seed: int = 13) -> tuple[pd.Series, pd.DataFrame, dict]:
    X = frame[SEG_COLS].astype(float)
    X = X.fillna(X.median())
    Z = StandardScaler().fit_transform(X)
    best = None
    sil = {}
    for k in k_range:
        km = KMeans(n_clusters=k, n_init=20, random_state=seed).fit(Z)
        sil[k] = round(float(silhouette_score(Z, km.labels_, sample_size=min(1000, len(Z)), random_state=seed)), 4)
        if best is None or sil[k] > sil[best[0]]:
            best = (k, km)
    k, km = best
    labels = pd.Series(km.labels_, index=X.index)
    centroids = X.groupby(labels).mean()

    # greedy unique assignment: best (cluster, persona) pairs first
    fits = {cl: persona_fit(row.to_dict()) for cl, row in centroids.iterrows()}
    pairs = sorted(((score, cl, name) for cl, f in fits.items() for name, score in f.items()), reverse=True)
    assigned, used = {}, set()
    for score, cl, name in pairs:
        if cl in assigned or name in used:
            continue
        assigned[cl] = name
        used.add(name)
    seg_rows = []
    order = sorted(assigned, key=lambda cl: list(PERSONAS).index(assigned[cl]))
    remap = {cl: i + 1 for i, cl in enumerate(order)}
    for cl in order:
        name = assigned[cl]
        cen = centroids.loc[cl]
        traits = []
        for comp in ("academic", "placement", "attendance", "lms", "skills", "engagement"):
            if cen[comp] >= 60:
                traits.append(f"High {comp}")
            elif cen[comp] <= 40:
                traits.append(f"Low {comp}")
        if cen["lms_slope"] < -0.12:
            traits.append("LMS activity falling")
        if cen["internal_delta"] < -6:
            traits.append("Internals below own past level")
        seg_rows.append(dict(id=remap[cl], persona=name, description=PERSONAS[name]["description"],
                             action=PERSONAS[name]["action"], size=int((labels == cl).sum()), traits=traits,
                             centroid={c: round(float(cen[c]), 2) for c in SEG_COLS}))
    return labels.map(remap), pd.DataFrame(seg_rows), {"k": k, "silhouette": sil}
