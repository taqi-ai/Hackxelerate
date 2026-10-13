import pandas as pd

from app.clean.resolve import Roster, best_match, link_by_email, link_by_name, link_by_roll, name_similarity, status_for
from app.config import MATCH_AUTO, MATCH_REVIEW

ROSTER = pd.DataFrame([
    dict(student_id="CU25CSE0001", name="Aarav Sharma", branch="CSE", year=2),
    dict(student_id="CU25CSE0002", name="Aditi Verma", branch="CSE", year=2),
    dict(student_id="CU25CSE0003", name="Rahul Kumar", branch="CSE", year=2),
    dict(student_id="CU25CSE0004", name="Rahul Kumar", branch="CSE", year=2),   # same-name collision
    dict(student_id="CU25CSE0005", name="Ishaan Bhatt", branch="CSE", year=2),
    dict(student_id="CU24ME0001", name="Aarav Sharma", branch="ME", year=3),     # same name, other block
])


def roster():
    return Roster.from_frame(ROSTER)


def test_similarity_handles_order_typos_and_initials():
    assert name_similarity("Sharma Aarav", "Aarav Sharma") >= 0.95
    assert name_similarity("Aarva Sharma", "Aarav Sharma") >= 0.85
    assert name_similarity("A. Sharma", "Aarav Sharma") >= 0.9
    assert name_similarity("B. Sharma", "Aarav Sharma") == 0.0


def test_blocking_keeps_same_name_in_other_branch_apart():
    sid, conf, _ = best_match("Aarav Sharma", roster().blocks[("CSE", 2)])
    assert sid == "CU25CSE0001" and conf >= MATCH_AUTO


def test_ambiguous_same_name_goes_to_review_not_auto():
    sid, conf, _ = best_match("Rahul Kumar", roster().blocks[("CSE", 2)])
    assert MATCH_REVIEW <= conf < MATCH_AUTO
    assert status_for(conf) == "review"


def test_link_by_roll_accepts_every_format():
    df = pd.DataFrame({"roll": ["25-CSE-1", "2025/CSE/005", "CU99CSE0001"], "src_ref": ["r1", "r2", "r3"], "src_key": ["k1", "k2", "k3"]})
    out = link_by_roll(df, "test", set(ROSTER.student_id))
    assert list(out.student_id[:2]) == ["CU25CSE0001", "CU25CSE0005"]
    assert list(out.status) == ["auto", "auto", "rejected"]


def test_link_by_email_uses_program_block():
    df = pd.DataFrame({"email": ["ishaan.bhatt@cumail.in", "aarav.sharma@cumail.in"],
                       "program": ["B.Tech CSE 2025", "B.Tech ME 2024"], "src_ref": ["a", "b"]})
    out = link_by_email(df, "lms", roster())
    assert list(out.student_id) == ["CU25CSE0005", "CU24ME0001"]
    assert (out.status == "auto").all()


def test_link_by_name_with_initial():
    df = pd.DataFrame({"name": ["I. Bhatt"], "branch": ["CSE"], "year": [2], "src_ref": ["x"], "src_key": ["x"]})
    out = link_by_name(df, "clubs", roster())
    assert out.student_id.iat[0] == "CU25CSE0005"
