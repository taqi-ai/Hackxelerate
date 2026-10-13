from datetime import date

import pytest

from app.clean.normalize import (email_name_guess, normalize_branch, normalize_name, normalize_roll, parse_date,
                                 to_0_100)


@pytest.mark.parametrize("raw,expected", [
    ("CU25AIML0042", "CU25AIML0042"),       # ERP
    ("cu25aiml0042", "CU25AIML0042"),       # skills JSON, lower-case
    ("25-AIML-42", "CU25AIML0042"),         # attendance register
    ("2025/AIML/042", "CU25AIML0042"),      # placement cell
    ("25AIML42", "CU25AIML0042"),           # hand-typed
    (" CU24 ME 0007 ", "CU24ME0007"),       # stray spaces
    ("CU25DS0101", "CU25DS0101"),
])
def test_roll_formats_normalise_to_one_id(raw, expected):
    assert normalize_roll(raw) == expected


@pytest.mark.parametrize("raw", ["", None, "hello", "CU25XYZ0042", float("nan")])
def test_unrecognised_rolls_are_rejected(raw):
    assert normalize_roll(raw) is None


def test_names_are_cleaned_but_keep_initials():
    assert normalize_name("  RAHUL   sharma ") == "Rahul Sharma"
    assert normalize_name("A.Kumar") == "A. Kumar"
    assert normalize_name("Dr. Meera Iyer") == "Meera Iyer"


def test_branch_synonyms():
    assert normalize_branch("cse aiml") == "CSE-AIML"
    assert normalize_branch("Mechanical") == "ME"
    assert normalize_branch("CSE-Data Science") == "CSE-Data Science"


def test_dates_in_all_campus_formats():
    for s in ("2026-08-14", "14/08/2026", "14-08-2026", "Aug 14, 2026"):
        assert parse_date(s) == date(2026, 8, 14)
    assert parse_date("not a date") is None


def test_ten_point_scale_is_rescaled_only_when_all_values_fit():
    out, rescaled = to_0_100({"a": 7.5, "b": 9.0})
    assert rescaled and out == {"a": 75.0, "b": 90.0}
    out, rescaled = to_0_100({"a": 7.5, "b": 65})
    assert not rescaled


def test_email_name_guess():
    assert email_name_guess("aarav.sharma2@cumail.in") == "aarav sharma"
    assert email_name_guess("a.sharma@cumail.in") == "a. sharma"
