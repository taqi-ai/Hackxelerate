"""Ascora ML & data service (FastAPI)."""
from __future__ import annotations

import logging
import shutil
import time
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import service
from .config import ALLOWED_ORIGINS, DEMO_DIR, GEMINI_API_KEY, ML_ROOT
from .insights.ask import ask as ask_query

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("ascora.api")
UPLOADS = ML_ROOT / "artifacts" / "uploads"

app = FastAPI(title="Ascora ML service", version="1.0.0",
              description="Integration pipeline, Success Score, risk models, what-if simulation and Ask Ascora.")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_origin_regex=r"https://ascora.*\.vercel\.app",
                   allow_methods=["GET", "POST"], allow_headers=["*"])


@app.on_event("startup")
def _startup():
    service.load_state()


class RunRequest(BaseModel):
    source: str = Field("demo", pattern="^(demo|upload)$")
    upload_id: str | None = None
    publish: bool = True


class WhatIfRequest(BaseModel):
    student_id: str = Field(..., pattern=r"^CU\d{2}[A-Z]{2,4}\d{4}$")
    changes: dict[str, float]


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=300)


@app.get("/health")
def health():
    return {"status": "ok", "model_state": bool(service.STATE) or service.STATE_FILE.exists(),
            "llm": "gemini" if GEMINI_API_KEY else "disabled (deterministic fallbacks)", "time": time.time()}


@app.post("/pipeline/upload")
async def upload(files: list[UploadFile] = File(...)):
    if not files or len(files) > 12:
        raise HTTPException(400, "Upload between 1 and 12 files")
    uid = uuid.uuid4().hex[:10]
    folder = UPLOADS / uid
    folder.mkdir(parents=True, exist_ok=True)
    saved = []
    for f in files:
        name = Path(f.filename or "file").name
        if Path(name).suffix.lower() not in (".csv", ".xlsx", ".json"):
            raise HTTPException(400, f"{name}: only CSV, XLSX and JSON are accepted")
        with (folder / name).open("wb") as out:
            shutil.copyfileobj(f.file, out, length=1 << 20)
        saved.append(name)
    # the mentors list is reference data the college already has
    if (DEMO_DIR / "mentors.csv").exists() and not (folder / "mentors.csv").exists():
        shutil.copy(DEMO_DIR / "mentors.csv", folder / "mentors.csv")
    return {"upload_id": uid, "files": saved}


@app.post("/pipeline/run")
def run(req: RunRequest):
    if req.source == "upload":
        if not req.upload_id or not (UPLOADS / req.upload_id).is_dir():
            raise HTTPException(400, "unknown upload_id")
        folder = UPLOADS / req.upload_id
    else:
        folder = DEMO_DIR
    st = service.start_run(folder, req.publish)
    return {"run_id": st.run_id, "status": st.status}


@app.get("/pipeline/runs/{run_id}")
def run_status(run_id: str):
    st = service.RUNS.get(run_id)
    if not st:
        raise HTTPException(404, "unknown run")
    return {"run_id": st.run_id, "status": st.status, "steps": st.steps, "summary": st.summary, "error": st.error}


@app.post("/whatif")
def whatif(req: WhatIfRequest):
    try:
        return service.whatif(req.student_id, req.changes)
    except KeyError:
        raise HTTPException(404, "unknown student")
    except ValueError as e:
        raise HTTPException(422, str(e))
    except LookupError as e:
        raise HTTPException(503, str(e))


@app.get("/whatif/{student_id}/inputs")
def whatif_inputs(student_id: str):
    try:
        return service.whatif_inputs(student_id)
    except KeyError:
        raise HTTPException(404, "unknown student")
    except LookupError as e:
        raise HTTPException(503, str(e))


@app.post("/ask")
def ask(req: AskRequest):
    return ask_query(req.question)
