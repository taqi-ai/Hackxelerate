"""Ascora ML & data service (FastAPI)."""
from __future__ import annotations

import logging
import shutil
import zipfile
import time
import uuid
from pathlib import Path

from fastapi.responses import JSONResponse
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import config, service
from .auth import current_user, require_admin, require_admin_write
from .config import ALLOWED_ORIGINS, DEMO_DIR, ML_ROOT
from .insights.llm import model_name, provider
from .insights.ask import ask as ask_query

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("ascora.api")
UPLOADS = ML_ROOT / "artifacts" / "uploads"

app = FastAPI(title="Ascora ML service", version="1.0.0",
              description="Integration pipeline, Success Score, risk models, what-if simulation and Ask Ascora.")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_origin_regex=r"https://ascora.*\.vercel\.app",
                   allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])


@app.on_event("startup")
def _startup():
    service.load_state()
    service.load_runs()


class RunRequest(BaseModel):
    source: str = Field("demo", pattern="^(demo|upload)$")
    upload_id: str | None = Field(None, pattern="^[0-9a-f]{10}$")   # exactly what /pipeline/upload issues
    publish: bool = True


class WhatIfRequest(BaseModel):
    student_id: str = Field(..., pattern=r"^CU\d{2}[A-Z]{2,4}\d{4}$")
    changes: dict[str, float]


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=300)


@app.get("/health")
def health():
    return {"status": "ok", "model_state": bool(service.STATE) or service.STATE_FILE.exists(),
            "llm": provider() if provider() != "none" else "disabled (deterministic fallbacks)", "llm_model": model_name(), "time": time.time()}


@app.get("/health/live")
def health_live():
    """Process is up. Never touches dependencies, so a slow database cannot restart a healthy process."""
    return {"status": "ok"}


@app.get("/health/ready")
def health_ready():
    """Ready to serve real traffic: configuration present and model state loaded. Reports booleans only, never values."""
    checks = {
        "auth_secret": bool(config.TOKEN_SECRET),
        "publish_token": bool(config.INGEST_TOKEN),
        "database_url": bool(config.SUPABASE_URL),
        "model_state": bool(service.STATE) or service.STATE_FILE.exists(),
    }
    ok = all(checks.values())
    return JSONResponse({"status": "ready" if ok else "not_ready", "checks": checks}, status_code=200 if ok else 503)


MAX_FILE_BYTES = 25 * 1024 * 1024        # per uploaded file
MAX_XLSX_INFLATED = 200 * 1024 * 1024    # guards against compressed "zip bomb" spreadsheets


def _check_upload(path: Path) -> None:
    """Reject files whose content does not match their extension, before any parser touches them."""
    head = path.open("rb").read(4096)
    suffix = path.suffix.lower()
    if suffix == ".xlsx":
        if not head.startswith(b"PK\x03\x04") or not zipfile.is_zipfile(path):
            raise HTTPException(400, f"{path.name}: not a valid Excel (.xlsx) file")
        with zipfile.ZipFile(path) as z:
            if sum(i.file_size for i in z.infolist()) > MAX_XLSX_INFLATED:
                raise HTTPException(400, f"{path.name}: the spreadsheet expands to an unsafe size")
    else:
        try:
            head.decode("utf-8-sig")
        except UnicodeDecodeError:
            # a multi-byte character may be cut at the 4 KB boundary; retry without the last 3 bytes
            try:
                head[:-3].decode("utf-8-sig")
            except UnicodeDecodeError:
                raise HTTPException(400, f"{path.name}: must be UTF-8 text")
        if b"\x00" in head:
            raise HTTPException(400, f"{path.name}: must be UTF-8 text")
        if suffix == ".json" and head.lstrip()[:1] not in (b"{", b"["):
            raise HTTPException(400, f"{path.name}: not a JSON document")


@app.post("/pipeline/upload", dependencies=[Depends(require_admin_write)])
async def upload(files: list[UploadFile] = File(...)):
    if not files or len(files) > 12:
        raise HTTPException(400, "Upload between 1 and 12 files")
    uid = uuid.uuid4().hex[:10]
    folder = UPLOADS / uid
    folder.mkdir(parents=True, exist_ok=True)
    saved = []
    try:
        for f in files:
            name = Path(f.filename or "file").name
            if Path(name).suffix.lower() not in (".csv", ".xlsx", ".json"):
                raise HTTPException(400, f"{name}: only CSV, XLSX and JSON are accepted")
            target = folder / name
            written = 0
            with target.open("wb") as out:
                while chunk := f.file.read(1 << 20):
                    written += len(chunk)
                    if written > MAX_FILE_BYTES:
                        raise HTTPException(413, f"{name}: larger than {MAX_FILE_BYTES // (1024 * 1024)} MB")
                    out.write(chunk)
            _check_upload(target)
            saved.append(name)
    except HTTPException:
        shutil.rmtree(folder, ignore_errors=True)   # never keep a rejected upload around
        raise
    # the mentors list is reference data the college already has
    if (DEMO_DIR / "mentors.csv").exists() and not (folder / "mentors.csv").exists():
        shutil.copy(DEMO_DIR / "mentors.csv", folder / "mentors.csv")
    return {"upload_id": uid, "files": saved}


@app.post("/pipeline/run", dependencies=[Depends(require_admin_write)])
def run(req: RunRequest):
    if req.source == "upload":
        if not req.upload_id or not (UPLOADS / req.upload_id).is_dir():
            raise HTTPException(400, "unknown upload_id")
        folder = UPLOADS / req.upload_id
    else:
        folder = DEMO_DIR
    try:
        st = service.start_run(folder, req.publish)
    except service.RunConflict as busy:
        raise HTTPException(409, f"Run {busy} is still in progress. Wait for it to finish.")
    return {"run_id": st.run_id, "status": st.status}


@app.get("/pipeline/runs/{run_id}", dependencies=[Depends(require_admin)])
def run_status(run_id: str):
    st = service.get_run(run_id)
    if not st:
        raise HTTPException(404, "unknown run")
    return {"run_id": st.run_id, "status": st.status, "steps": st.steps, "summary": st.summary, "error": st.error}


@app.post("/whatif", dependencies=[Depends(current_user)])
def whatif(req: WhatIfRequest):
    try:
        return service.whatif(req.student_id, req.changes)
    except KeyError:
        raise HTTPException(404, "unknown student")
    except ValueError as e:
        raise HTTPException(422, str(e))
    except LookupError as e:
        raise HTTPException(503, str(e))


@app.get("/whatif/{student_id}/inputs", dependencies=[Depends(current_user)])
def whatif_inputs(student_id: str):
    try:
        return service.whatif_inputs(student_id)
    except KeyError:
        raise HTTPException(404, "unknown student")
    except LookupError as e:
        raise HTTPException(503, str(e))


@app.post("/ask", dependencies=[Depends(current_user)])
def ask(req: AskRequest):
    return ask_query(req.question)
