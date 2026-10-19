"""Data-source connectors and their real, server-side status.

Only the file import is built. Every other source is listed so an institution can see what is planned, and is reported
as not configured until a real, authorised connection has been built, tested and has synced. Nothing here ever claims a
connection that has not happened (see docs/engineering/CONNECTOR_ARCHITECTURE.md).
"""
from __future__ import annotations

import time

from . import service

STALE_AFTER_DAYS = 14

CATALOG = [
    {"id": "file_import", "name": "File import (CSV, Excel, JSON)", "kind": "file", "supported": True,
     "how": "An admin uploads the seven campus exports on Data integration, or runs the bundled cohort."},
    {"id": "scheduled_export", "name": "Scheduled export (SFTP or object storage)", "kind": "file", "supported": False,
     "how": "Needs an institution-approved drop location and credentials."},
    {"id": "oneroster", "name": "OneRoster 1.2 (rosters, enrolments, grades)", "kind": "api", "supported": False,
     "how": "Needs an institution system that implements OneRoster and an OAuth client."},
    {"id": "moodle", "name": "Moodle web services", "kind": "api", "supported": False,
     "how": "Needs a Moodle web-service token with read-only scopes issued by the institution."},
    {"id": "canvas", "name": "Canvas REST API", "kind": "api", "supported": False,
     "how": "Needs a Canvas developer key approved by the institution."},
    {"id": "cuims", "name": "CUIMS (Chandigarh University)", "kind": "api", "supported": False,
     "how": "No public API. Needs written authorisation and an approved export or read-only view from the university."},
]


def file_import_status(runs: list) -> dict:
    """Healthy / Stale / Syncing / Needs attention / Not configured, from the actual pipeline run history."""
    if not runs:
        return {"status": "Not configured", "last_sync": None, "detail": "No import has run yet."}
    latest = max(runs, key=lambda r: r.run_id)
    if latest.status == "running":
        return {"status": "Syncing", "last_sync": None, "detail": f"Run {latest.run_id} in progress."}
    if latest.status != "done":
        return {"status": "Needs attention", "last_sync": None, "detail": latest.error or "The last run failed."}
    finished = (latest.summary or {}).get("finished_at")
    if finished is None:
        return {"status": "Healthy", "last_sync": None, "detail": f"Last run {latest.run_id} succeeded."}
    age_days = (time.time() - float(finished)) / 86400
    status = "Stale" if age_days > STALE_AFTER_DAYS else "Healthy"
    return {"status": status, "last_sync": float(finished),
            "detail": f"Last successful import {age_days:.0f} day(s) ago." if age_days >= 1 else "Imported today."}


def list_connectors() -> list[dict]:
    out = []
    for c in CATALOG:
        if c["id"] == "file_import":
            st = file_import_status(list(service.RUNS.values()))
        elif c["id"] == "cuims":
            st = {"status": "Awaiting institution authorisation", "last_sync": None, "detail": c["how"]}
        else:
            st = {"status": "Not configured", "last_sync": None, "detail": c["how"]}
        out.append({**c, **st})
    return out
