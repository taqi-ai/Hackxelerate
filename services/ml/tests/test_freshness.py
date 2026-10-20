"""Per-source freshness comes from dates inside the data, and sources without dates are never given one."""
from datetime import date

from app.freshness import month_sheet_end, source_freshness
from app.ingest.readers import read_folder
from app.config import DEMO_DIR


def test_month_sheet_end_and_bad_names():
    assert month_sheet_end("Oct 2026") == date(2026, 10, 31)
    assert month_sheet_end("Feb 2028") == date(2028, 2, 29)
    assert month_sheet_end("Summary") is None


def test_ages_staleness_and_honest_gaps():
    f = source_freshness(attendance_sheets=["Aug 2026", "Oct 2026"], lms_dates=[date(2026, 10, 5), None],
                         club_dates=[date(2026, 9, 1)], feedback_dates=[], skills_exported_at="2026-10-09T18:30:00+05:30",
                         erp_max_semester=5, has_placement=True, run_date=date(2026, 10, 20))
    # a month sheet has no day-level dates: only the start of the month is certain
    assert f["attendance_register"]["as_of"] == "2026-10-01" and f["attendance_register"]["stale"] is False
    assert f["lms_activity_log"] == {"as_of": "2026-10-11", "basis": "latest activity week", "age_days": 9,
                                     "stale": False, "stale_after_days": 14}
    assert f["clubs_events"]["age_days"] == 49
    assert f["feedback_forms"]["as_of"] is None and "no submission dates" in f["feedback_forms"]["basis"]
    assert f["skills_assessment"]["as_of"] == "2026-10-09"
    assert f["erp_academics"]["as_of"] is None and "semester 5" in f["erp_academics"]["basis"]
    assert f["placement_cell"]["as_of"] is None

    later = source_freshness(attendance_sheets=["Oct 2026"], lms_dates=[date(2026, 10, 5)], club_dates=[], feedback_dates=[],
                             skills_exported_at=None, erp_max_semester=5, has_placement=False, run_date=date(2027, 1, 15))
    assert later["attendance_register"]["stale"] is True and later["lms_activity_log"]["stale"] is True
    assert "placement_cell" not in later


def test_demo_files_carry_the_dates_we_rely_on():
    frames = read_folder(DEMO_DIR)
    assert frames["skills_assessment"].meta.get("exported_at")
    assert set(frames["attendance_register"].df["src_sheet"].dropna()) >= {"Oct 2026"}
