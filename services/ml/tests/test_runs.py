"""Pipeline run state must survive a service restart and runs must not overlap."""
import json
import time

from fastapi.testclient import TestClient

from app import auth, config, service
from app.main import app

SECRET = "unit-test-secret-0123456789"


def admin():
    return {"Authorization": "Bearer " + auth.sign({"sub": "a", "role": "admin", "exp": time.time() + 600}, SECRET)}


def test_status_survives_restart_and_interrupted_runs_are_marked(monkeypatch, tmp_path):
    monkeypatch.setattr(service, "RUNS_DIR", tmp_path)
    monkeypatch.setattr(service, "RUNS", {})
    done = service.RunState(run_id="r-done", status="done", summary={"students": 3})
    service.save_run(done)
    (tmp_path / "r-live.json").write_text(json.dumps({"run_id": "r-live", "status": "running", "steps": [], "summary": {}, "error": None}))
    service.RUNS.clear()                       # simulate a restart: memory is gone
    service.load_runs()
    assert service.RUNS["r-done"].status == "done" and service.RUNS["r-done"].summary == {"students": 3}
    assert service.RUNS["r-live"].status == "error" and "restart" in service.RUNS["r-live"].error
    assert json.loads((tmp_path / "r-live.json").read_text())["status"] == "error"   # the correction is persisted

    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    r = TestClient(app).get("/pipeline/runs/r-done", headers=admin())
    assert r.status_code == 200 and r.json()["status"] == "done"


def test_second_run_is_refused_while_one_is_running(monkeypatch, tmp_path):
    monkeypatch.setattr(service, "RUNS_DIR", tmp_path)
    monkeypatch.setattr(service, "RUNS", {"r1": service.RunState(run_id="r1", status="running")})
    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    r = TestClient(app).post("/pipeline/run", headers=admin(), json={"source": "demo", "publish": False})
    assert r.status_code == 409 and "r1" in r.json()["detail"]


def test_upload_id_cannot_point_outside_the_uploads_folder(monkeypatch, tmp_path):
    monkeypatch.setattr(service, "RUNS_DIR", tmp_path)
    monkeypatch.setattr(service, "RUNS", {})
    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    client = TestClient(app)
    for bad in ("../../etc", "..", "abc/def", "ABCDEF1234", "0123456789/../x"):
        r = client.post("/pipeline/run", headers=admin(), json={"source": "upload", "upload_id": bad, "publish": False})
        assert r.status_code == 422, bad


def test_a_run_over_the_time_limit_is_stopped_and_frees_the_slot(monkeypatch, tmp_path):
    monkeypatch.setattr(service, "RUNS_DIR", tmp_path)
    old = service.RunState(run_id="r-slow", started=time.time() - service.RUN_TIMEOUT_S - 5)
    monkeypatch.setattr(service, "RUNS", {"r-slow": old})
    assert service.get_run("r-slow").status == "error" and "Nothing was published" in old.error
    assert json.loads((tmp_path / "r-slow.json").read_text())["status"] == "error"
    busy = service.RunState(run_id="r-pub", started=time.time() - service.RUN_TIMEOUT_S - 5, publishing=True)
    assert service.expire(busy) is False and busy.status == "running"   # never stopped half-way through writing rows


def test_a_stopped_run_never_publishes_or_replaces_the_model(monkeypatch, tmp_path):
    monkeypatch.setattr(service, "RUNS_DIR", tmp_path)
    run = service.RunState(run_id="r-x")
    calls = []

    def slow_integration(folder, sl, truth_dir):
        run.status, run.error = "error", "stopped"   # the time limit fires while files are being parsed
        return object()

    monkeypatch.setattr(service, "_load_cache", lambda fp: None)
    monkeypatch.setattr(service, "run_integration", slow_integration)
    monkeypatch.setattr(service, "run_intelligence", lambda *a: calls.append("intelligence"))
    monkeypatch.setattr(service, "save_state", lambda *a: calls.append("save_state"))
    monkeypatch.setattr(service, "Publisher", lambda: calls.append("publish"))
    try:
        service.run_all(service.DEMO_DIR, publish=True, run=run)
        raise AssertionError("a stopped run must not finish")
    except service.RunStopped:
        pass
    assert calls == [] and run.status == "error"
