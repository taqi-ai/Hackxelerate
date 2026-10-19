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


def test_shared_demo_accounts_cannot_change_published_data(monkeypatch):
    """The demo logins are public. A demo admin may read and simulate, but may not run, publish or upload."""
    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    client = TestClient(app)
    demo = {"Authorization": "Bearer " + auth.sign({"sub": "d1", "role": "admin", "demo": True, "exp": time.time() + 600}, SECRET)}
    r = client.post("/pipeline/run", headers=demo, json={"source": "demo", "publish": False})
    assert r.status_code == 403 and "demo" in r.json()["detail"].lower()
    assert client.post("/pipeline/upload", headers=demo, files={"files": ("a.csv", b"x,y\n1,2\n", "text/csv")}).status_code == 403
    assert client.get("/pipeline/runs/does-not-exist", headers=demo).status_code == 404   # reading run status is fine
    assert client.post("/ask", headers=demo, json={"question": "high risk students"}).status_code == 200


def test_upload_rejects_disguised_oversized_and_bomb_files(monkeypatch, tmp_path):
    import io, zipfile
    from app import main
    monkeypatch.setattr(config, "TOKEN_SECRET", SECRET)
    monkeypatch.setattr(main, "UPLOADS", tmp_path)
    monkeypatch.setattr(main, "MAX_FILE_BYTES", 2048)
    client = TestClient(app)
    admin = {"Authorization": f"Bearer {token('admin')}"}
    def post(name, data, ctype="application/octet-stream"):
        return client.post("/pipeline/upload", headers=admin, files={"files": (name, data, ctype)})
    assert post("ok.csv", b"roll_no,name\nCU25CSE0001,Asha\n", "text/csv").status_code == 200
    assert post("fake.xlsx", b"MZ\x90\x00 not a spreadsheet").status_code == 400          # wrong signature
    assert post("bin.csv", b"\x00\x01\x02\xff\xfe binary").status_code == 400             # not text
    assert post("big.csv", b"a,b\n" + b"1,2\n" * 2000, "text/csv").status_code == 413     # over the size limit
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("xl/worksheets/sheet1.xml", b"0" * 50_000_000)                         # ~50 MB inflated
    monkeypatch.setattr(main, "MAX_FILE_BYTES", 10_000_000)
    monkeypatch.setattr(main, "MAX_XLSX_INFLATED", 10_000_000)
    assert post("bomb.xlsx", buf.getvalue()).status_code == 400
    assert not any(p.is_file() for p in tmp_path.rglob("*") if p.name in ("fake.xlsx", "bin.csv", "big.csv", "bomb.xlsx"))
