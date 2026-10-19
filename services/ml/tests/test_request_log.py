import json
import logging

from fastapi.testclient import TestClient

from app.main import app


def test_every_response_has_a_request_id_and_logs_no_student_ids(caplog):
    client = TestClient(app)
    with caplog.at_level(logging.INFO, logger="ascora.request"):
        r = client.get("/whatif/CU25CSE0042/inputs")                 # 401 without a token: still logged
        r2 = client.get("/health/live", headers={"X-Request-ID": "abc123"})
    assert r.headers.get("X-Request-ID") and r2.headers["X-Request-ID"] == "abc123"
    lines = [json.loads(rec.getMessage()) for rec in caplog.records if rec.name == "ascora.request"]
    assert any(l["path"] == "/whatif/[student-id]/inputs" and l["status"] == 401 for l in lines)
    assert all("CU25CSE0042" not in json.dumps(l) for l in lines)
    assert all({"request_id", "method", "path", "status", "ms"} <= set(l) for l in lines)


def test_untrusted_request_ids_are_not_echoed(caplog):
    r = TestClient(app).get("/health/live", headers={"X-Request-ID": "<script>alert(1)</script>" * 5})
    assert "<script>" not in r.headers["X-Request-ID"]
