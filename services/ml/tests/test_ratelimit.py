import pytest
from fastapi import HTTPException

from app import ratelimit


@pytest.fixture(autouse=True)
def clean():
    ratelimit.reset()
    yield
    ratelimit.reset()


def test_blocks_after_limit_and_reports_retry_after(monkeypatch):
    monkeypatch.setattr(ratelimit, "LIMIT", 3)
    for i in range(3):
        ratelimit._check("ask", "u1", now=100.0 + i)
    with pytest.raises(HTTPException) as e:
        ratelimit._check("ask", "u1", now=103.0)
    assert e.value.status_code == 429
    assert int(e.value.headers["Retry-After"]) >= 1


def test_window_slides_and_callers_are_independent(monkeypatch):
    monkeypatch.setattr(ratelimit, "LIMIT", 2)
    ratelimit._check("ask", "u1", now=0.0)
    ratelimit._check("ask", "u1", now=1.0)
    ratelimit._check("ask", "u2", now=1.0)          # other caller unaffected
    ratelimit._check("whatif", "u1", now=1.0)       # other bucket unaffected
    with pytest.raises(HTTPException):
        ratelimit._check("ask", "u1", now=2.0)
    ratelimit._check("ask", "u1", now=61.5)         # first hit has left the window


def test_endpoint_returns_429_when_exceeded(monkeypatch):
    import time
    from fastapi.testclient import TestClient
    from app import auth
    from app.main import app
    monkeypatch.setattr(auth.config, "TOKEN_SECRET", "unit-test-secret-0123456789")
    monkeypatch.setattr(ratelimit, "LIMIT", 2)
    h = {"Authorization": "Bearer " + auth.sign({"sub": "rl", "role": "mentor", "exp": time.time() + 600}, "unit-test-secret-0123456789")}
    c = TestClient(app)
    codes = [c.post("/ask", headers=h, json={"question": "high risk students"}).status_code for _ in range(3)]
    assert codes[:2] == [200, 200] and codes[2] == 429
