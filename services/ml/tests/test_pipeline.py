"""Integration tests on the frozen demo set: conflicts, matching accuracy, schema auto-mapping, score sanity."""
import pandas as pd
import pytest

from app.config import DEMO_DIR, SCORE_WEIGHTS
from app.features.build import build_features
from app.ingest.schema import detect_source
from app.pipeline import StepLog, run_integration, tag_feedback, detect_language
from app.scoring.score import PercentileRef, component_scores, sensitivity, success_score


@pytest.fixture(scope="module")
def result():
    return run_integration(DEMO_DIR, StepLog(), truth_dir=DEMO_DIR)


def test_auto_mapping_detects_sources_from_headers():
    assert detect_source(["Roll Number", "Subject", "Classes Held", "Classes Attended"]).source_type == "attendance_register"
    assert detect_source(["user_email", "program", "logins", "assignments_due"]).source_type == "lms_activity_log"
    assert detect_source(["Participant Name", "Branch", "Event / Activity"]).source_type == "clubs_events"


def test_every_student_is_unified(result):
    assert len(result.students) == 1200
    assert result.students.student_id.is_unique


def test_planted_branch_conflicts_are_found_and_resolved(result):
    c = result.conflicts
    branch = c[c.attribute == "branch"]
    assert len(branch) >= 10
    assert (branch.resolution.str.contains("Majority")).all()


def test_attendance_conflicts_use_register_as_truth(result):
    c = result.conflicts[result.conflicts.attribute == "attendance_pct"]
    assert len(c) > 0
    assert (c.resolved_value == c.value_b).all()


def test_auto_links_are_precise(result):
    ev = result.report["matching"]["evaluation_vs_truth"]
    for src, m in ev.items():
        assert m["precision_auto"] >= 0.99, src
    assert result.report["matching"]["fuzzy_overall"]["recall_auto"] >= 0.9


def test_duplicates_merged(result):
    s = {x["key"]: x for x in result.report["steps"]}
    assert s["dedupe"]["metrics"]["erp_duplicate_rows"] > 0
    assert s["dedupe"]["metrics"]["lms_students_with_multiple_accounts_merged"] > 0


def test_score_is_bounded_weighted_and_stable(result):
    f = build_features(result.students, result.tables, result.weekly)
    x = f.copy()
    x["eng_weighted"] = 3 * x.hackathons + 2 * x.certifications + x.workshops + x.clubs
    x["mocks"] = x.mocks.fillna(0)
    comps = component_scores(f, PercentileRef(x.select_dtypes(exclude=[object])))
    s = success_score(comps)
    assert s.between(0, 100).all()
    assert abs(sum(SCORE_WEIGHTS.values()) - 1) < 1e-9
    assert sensitivity(comps)["min_spearman"] > 0.97


def test_feedback_language_and_tags():
    assert detect_language("सिलेबस बहुत ज़्यादा है") == "hi"
    assert detect_language("Bahut zyada assignments hain, deadlines clash ho rahi hain.") == "hinglish"
    theme, sentiment = tag_feedback("Too much syllabus and very little time", 2)
    assert theme == "workload & deadlines" and sentiment == "negative"
