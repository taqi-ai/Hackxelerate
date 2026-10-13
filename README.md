# Ascora

**From early warning to real intervention.** An AI-powered student success platform for colleges, built for HacXLerate 2026 (byteXL), KPMG in India challenge 04: *Smart Campus Analytics: Predict, Optimize & Improve Student Success.*

Live app: https://ascora-five.vercel.app

Ascora joins seven campus systems into one view of every student, scores success, finds two separate risks (academic and placement), explains every flag in plain language, and tracks what mentors do about it. All data is synthetic.

## Demo logins

| Role | Email | Sees |
|---|---|---|
| HOD / Admin | `admin@ascora.test` | Whole campus, data integration, fairness |
| Faculty mentor | `mentor@ascora.test` | Only their 64 assigned students (enforced by the database) |

The password is shown on the login page for the demo accounts.

## What is where

| Path | Contents |
|---|---|
| `apps/web` | Next.js 15 dashboard (Supabase Auth, role-based pages) |
| `services/ml` | FastAPI service: integration pipeline, Success Score, risk models, SHAP, segments, what-if, Ask Ascora |
| `data/generator` | Synthetic cohort generator: 1,200 students, 7 deliberately messy source files, hidden ground truth |
| `data/demo` | The frozen dataset used for judging |
| `supabase/migrations` | Schema, row-level security, ingest RPCs |
| `docs` | Score note, architecture, demo script, pitch outline, requirements matrix, fairness and model notes |
| `motion` | Remotion project for the demo video |

Start with [docs/score-note.md](docs/score-note.md) (the deliverable explaining the Success Score) and [docs/architecture.md](docs/architecture.md).

## Run it locally

Requirements: Node 22, Python 3.12.

```bash
# 1. ML service
cd services/ml
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # Windows; use .venv/bin/python on macOS/Linux
cp .env.example .env                                          # fill in values
.venv/Scripts/python -m pytest -q                             # 31 tests
.venv/Scripts/python scripts/publish_demo.py --no-publish     # run the pipeline locally, write the offline snapshot
.venv/Scripts/python -m uvicorn app.main:app --port 8000

# 2. Web app
cd apps/web
cp .env.example .env.local                                    # fill in values
npm install
npm run dev                  # against Supabase
npm run dev:offline          # no Supabase, no internet: serves demo-data/snapshot.json
```

`npm run dev:offline` is the venue-Wi-Fi insurance. It skips auth, so it is refused on Vercel.

To publish a fresh run to Supabase, set `ASCORA_INGEST_TOKEN` in `services/ml/.env` (generate a random string, store its SHA-256 in `private.ingest_secret`), then run `publish_demo.py` without `--no-publish`.

## Tests and CI

- `services/ml`: 31 tests (normalisation, entity resolution, conflicts, scoring, matching accuracy on the demo set).
- GitHub Actions: web lint, typecheck and build; ML tests; motion typecheck; secret scan.
- Vercel deploys every push to `main`.

## Known limitations

- Synthetic data: accuracy figures show the pipeline works, not performance at a real college.
- The ML service runs locally until it is deployed (planned: Azure App Service). Until then the live site shows the last published run; the pipeline runner and what-if simulator need the service.
- Four fairness checks are marked "review needed" (see `/fairness`).
