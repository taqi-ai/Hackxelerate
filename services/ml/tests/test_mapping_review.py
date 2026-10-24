import pytest

from app.ingest import review


def test_exact_headers_are_confident_and_importable():
    r = review.suggest(["Roll No", "Student Name", "Subject", "SGPA"], "erp_academics")
    assert r["can_import"] and not r["needs_review"]
    assert {c["tier"] for c in r["columns"]} == {"confident"}


def test_fuzzy_match_is_flagged_uncertain_with_alternatives():
    r = review.suggest(["Roll Number Student", "Student Name", "Subject"], "erp_academics")
    fuzzy = [c for c in r["columns"] if c["method"] and c["method"].startswith("fuzzy")]
    for c in fuzzy:
        assert c["tier"] == "uncertain" and c["alternatives"]


def test_missing_required_fields_block_import():
    r = review.suggest(["Student Name", "Subject"], "erp_academics")
    assert r["missing_required"] == ["roll"] and not r["can_import"] and r["needs_review"]


def test_source_detection_when_not_given():
    r = review.suggest(["user_email", "logins", "week_start", "minutes_active"])
    assert r["source_type"] == "lms_activity_log" and r["detected"]


def test_unknown_columns_are_unmapped_not_guessed():
    r = review.suggest(["Roll No", "Student Name", "Subject", "Blood Group"], "erp_academics")
    bg = next(c for c in r["columns"] if c["header"] == "Blood Group")
    assert bg["tier"] == "unmapped" and bg["field"] is None


def test_overrides_fix_a_mapping_and_are_validated():
    hs = ["ID", "Student Name", "Subject"]
    r = review.apply_overrides(hs, "erp_academics", {"ID": "roll"})
    assert r["can_import"] and r["columns"]["ID"] == "roll"
    with pytest.raises(ValueError):
        review.apply_overrides(hs, "erp_academics", {"Nope": "roll"})
    with pytest.raises(ValueError):
        review.apply_overrides(hs, "erp_academics", {"ID": "not_a_field"})
    with pytest.raises(ValueError):
        review.apply_overrides(["ID", "Roll No", "Student Name", "Subject"], "erp_academics", {"ID": "roll"})


def test_ignoring_a_column_is_allowed_but_required_stays_enforced():
    r = review.apply_overrides(["Roll No", "Student Name", "Subject"], "erp_academics", {"Subject": None})
    assert not r["can_import"] and r["missing_required"] == ["subject"]


@pytest.mark.parametrize("bad", [[], "x", ["a", "A "], [""], ["x" * 500], [str(i) for i in range(300)]])
def test_bad_header_lists_are_refused(bad):
    with pytest.raises(ValueError):
        review.suggest(bad, "erp_academics")


def test_unknown_source_refused():
    with pytest.raises(ValueError):
        review.suggest(["a"], "payroll")


def test_preview_blanks_missing_values_instead_of_zero():
    out = review.preview([{"ID": "1", "Marks": ""}, {"ID": "2", "Marks": "7"}], {"ID": "roll", "Marks": "sgpa"})
    assert out[0] == {"roll": "1", "sgpa": None} and out[1]["sgpa"] == "7"


def test_exact_match_beats_an_earlier_fuzzy_match_for_the_same_field():
    # "ID" alone fuzzy-matches "student id" (roll); the later exact "Roll No" must still win the field
    r = review.suggest(["ID", "Roll No", "Student Name", "Subject"], "erp_academics")
    cols = {c["header"]: c for c in r["columns"]}
    assert cols["Roll No"]["field"] == "roll" and cols["Roll No"]["tier"] == "confident"
    assert cols["ID"]["field"] is None


def test_mapping_endpoint_is_admin_only_and_validates(monkeypatch):
    import time
    from fastapi.testclient import TestClient
    from app import auth, config
    from app.main import app
    secret = "unit-test-secret-0123456789"
    monkeypatch.setattr(config, "TOKEN_SECRET", secret)

    def hdr(role):
        return {"Authorization": "Bearer " + auth.sign({"sub": "m", "role": role, "exp": time.time() + 600}, secret)}

    c = TestClient(app)
    body = {"headers": ["Roll No", "Student Name", "Subject"], "source_type": "erp_academics"}
    assert c.post("/mapping/suggest", json=body).status_code == 401
    assert c.post("/mapping/suggest", headers=hdr("mentor"), json=body).status_code == 403
    ok = c.post("/mapping/suggest", headers=hdr("admin"), json=body)
    assert ok.status_code == 200 and ok.json()["can_import"] is True
    assert c.post("/mapping/suggest", headers=hdr("admin"), json={"headers": ["a", "A"], "source_type": "erp_academics"}).status_code == 422
    assert c.post("/mapping/suggest", headers=hdr("admin"), json={"headers": ["a"], "overrides": {"a": "roll"}}).status_code == 422
