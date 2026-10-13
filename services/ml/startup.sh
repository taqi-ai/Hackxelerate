#!/bin/bash
# Azure App Service startup for the Ascora ML service.
#
# Two layers, so deploys are fast:
#   1. heavy dependencies live in /home/deps (persistent across deploys and restarts) and are installed
#      only when requirements.txt changes (tracked by hash)
#   2. the app code is a tiny zip that replaces /home/site/wwwroot in seconds
set -e
ROOT=/home/site/wwwroot
DEPS=/home/deps
REQ="$ROOT/requirements.txt"

HASH=$(sha256sum "$REQ" | cut -d' ' -f1)
if [ ! -f "$DEPS/.hash" ] || [ "$(cat "$DEPS/.hash")" != "$HASH" ]; then
  echo "[startup] requirements changed, installing dependencies into $DEPS"
  rm -rf "$DEPS"
  mkdir -p "$DEPS"
  python -m pip install --quiet --disable-pip-version-check uv
  python -m uv pip install --quiet --target "$DEPS" --python "$(command -v python)" -r "$REQ"
  echo "$HASH" > "$DEPS/.hash"
  echo "[startup] dependencies installed"
fi

export PYTHONPATH="$DEPS"
export PYTHONUNBUFFERED=1
exec python -m uvicorn app.main:app --app-dir "$ROOT/services/ml" --host 0.0.0.0 --port 8000 --workers 1
