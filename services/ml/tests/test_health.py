from fastapi.testclient import TestClient

from app import config, service
from app.main import app


def test_live_is_always_ok():
    assert TestClient(app).get("/health/live").json() == {"status": "ok"}


def test_ready_reports_missing_configuration_without_leaking_values(monkeypatch):
    monkeypatch.setattr(config, "TOKEN_SECRET", "s3cret-value-should-not-appear")
    monkeypatch.setattr(config, "INGEST_TOKEN", "")
    r = TestClient(app).get("/health/ready")
    assert r.status_code == 503
    body = r.json()
    assert body["checks"]["auth_secret"] is True and body["checks"]["publish_token"] is False
    assert "s3cret" not in r.text


def test_ready_ok_when_configured(monkeypatch):
    monkeypatch.setattr(config, "TOKEN_SECRET", "x")
    monkeypatch.setattr(config, "INGEST_TOKEN", "y")
    monkeypatch.setattr(config, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(service, "STATE", {"features": 1})
    r = TestClient(app).get("/health/ready")
    assert r.status_code == 200 and r.json()["status"] == "ready"
