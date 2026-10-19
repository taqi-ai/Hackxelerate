import time

from fastapi.testclient import TestClient

from app import auth, config, connectors, service
from app.main import app

SECRET = "unit-test-secret-0123456789"


def tok(role):
    return {"Authorization": "Bearer " + auth.sign({"sub": "u", "role": role, "exp": time.time() + 600}, SECRET)}


def run(rid, status, age_days=0, error=None):
    st = service.RunState(run_id=rid, status=status, error=error)
    st.summary = {"finished_at": time.time() - age_days * 86400}
    return st


def test_file_import_status_follows_real_run_history():
    s = connectors.file_import_status
    assert s([])["status"] == "Not configured"
    assert s([run("a", "running")])["status"] == "Syncing"
    assert s([run("a", "error", error="bad file")])["status"] == "Needs attention"
    assert s([run("a", "done", age_days=1)])["status"] == "Healthy"
    assert s([run("a", "done", age_days=40)])["status"] == "Stale"


def test_unbuilt_connectors_never_claim_a_connection(monkeypatch):
    monkeypatch.setattr(service, "RUNS", {})
    out = {c["id"]: c for c in connectors.list_connectors()}
    assert out["cuims"]["status"] == "Awaiting institution authorisation"
    for cid in ("oneroster", "moodle", "canvas", "scheduled_export"):
        assert out[cid]["status"] == "Not configured" and out[cid]["supported"] is False
    assert not any(c["status"] in ("Healthy", "Connected") for c in out.values() if not c["supported"])


def test_connectors_endpoint_is_admin_only(monkeypatch):
    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    client = TestClient(app)
    assert client.get("/connectors").status_code == 401
    assert client.get("/connectors", headers=tok("mentor")).status_code == 403
    r = client.get("/connectors", headers=tok("admin"))
    assert r.status_code == 200 and any(c["id"] == "file_import" for c in r.json()["connectors"])
