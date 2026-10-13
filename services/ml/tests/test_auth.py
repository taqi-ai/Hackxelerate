import time

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import auth, config
from app.main import app

SECRET = "unit-test-secret-0123456789"


def token(role="admin", exp_in=600):
    return auth.sign({"sub": "u1", "role": role, "exp": time.time() + exp_in}, SECRET)


def test_roundtrip_and_claims():
    c = auth.verify(token("mentor"), SECRET)
    assert c["role"] == "mentor" and c["sub"] == "u1"


def test_tampered_token_is_rejected():
    t = token()
    payload, sig = t.split(".")
    forged = auth.sign({"sub": "u1", "role": "admin", "exp": time.time() + 600}, "other-secret")
    for bad in (payload + "." + "A" + sig[1:], forged, "garbage", ""):
        with pytest.raises(HTTPException) as e:
            auth.verify(bad, SECRET)
        assert e.value.status_code in (401, 503)


def test_expired_token_is_rejected():
    with pytest.raises(HTTPException) as e:
        auth.verify(token(exp_in=-5), SECRET)
    assert e.value.status_code == 401


def test_fails_closed_without_secret():
    with pytest.raises(HTTPException) as e:
        auth.verify(token(), "")
    assert e.value.status_code == 503


def test_endpoints_enforce_signed_in_user_and_admin_role(monkeypatch):
    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    client = TestClient(app)
    assert client.get("/health").status_code == 200                                     # public
    protected = (("post", "/ask"), ("post", "/whatif"), ("get", "/whatif/CU25CSE0001/inputs"),
                 ("post", "/pipeline/run"), ("get", "/pipeline/runs/x"), ("post", "/pipeline/upload"))
    for method, path in protected:
        assert getattr(client, method)(path).status_code == 401, f"{path} must reject anonymous calls"
    mentor = {"Authorization": f"Bearer {token('mentor')}"}
    admin = {"Authorization": f"Bearer {token('admin')}"}
    assert client.post("/pipeline/run", headers=mentor, json={"source": "demo", "publish": False}).status_code == 403
    assert client.post("/ask", headers=mentor, json={"question": "high risk students"}).status_code == 200
    assert client.get("/pipeline/runs/does-not-exist", headers=admin).status_code == 404
    assert client.get("/whatif/CU25CSE0001/inputs", headers={"Authorization": "Bearer garbage"}).status_code == 401
