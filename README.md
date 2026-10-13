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
| `apps/mobile` | Expo React Native companion app (Android, iOS, Web simulator) |
| `services/ml` | FastAPI service: integration pipeline, Success Score, risk models, SHAP, segments, what-if, Ask Ascora |
| `data/generator` | Synthetic cohort generator: 1,200 students, 7 deliberately messy source files, hidden ground truth |
| `data/demo` | The frozen dataset used for judging |
| `supabase/migrations` | Schema, row-level security, ingest RPCs |
| `docs` | Score note, architecture, demo script, pitch outline, requirements matrix, fairness and model notes |

Start with [docs/score-note.md](docs/score-note.md) (the deliverable explaining the Success Score) and [docs/architecture.md](docs/architecture.md).

## Run it locally

Requirements: Node 22, Python 3.12.

```bash
# 1. ML service
cd services/ml
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt     # Windows; use .venv/bin/python on macOS/Linux
cp .env.example .env                                          # fill in values
.venv/Scripts/python -m pytest -q                             # 36 tests
.venv/Scripts/python scripts/publish_demo.py --no-publish     # run the pipeline locally, write the offline snapshot
.venv/Scripts/python -m uvicorn app.main:app --port 8000

# 2. Web app
cd apps/web
cp .env.example .env.local                                    # fill in values
npm install
npm run dev                  # against Supabase
npm run dev:offline          # no Supabase, no internet: serves demo-data/snapshot.json

# 3. Mobile app (Expo / React Native)
cd apps/mobile
cp .env.example .env                                          # fill in values (EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY)
npm install
npm run web                  # runs interactive device simulator on port 8082 (iPhone, Android, Tablet)
npx expo start               # runs native Expo Go for physical Android/iOS devices
```

`npm run dev:offline` is the venue-Wi-Fi insurance. It skips auth, so it is refused on Vercel.

To publish a fresh run to Supabase, set `ASCORA_INGEST_TOKEN` in `services/ml/.env` (generate a random string, store its SHA-256 in `private.ingest_secret`), then run `publish_demo.py` without `--no-publish`.

## Azure AI, security and deploys

- **LLM:** Azure OpenAI `gpt-4.1-mini` (resource `ascora-ai-koreacentral`, the region the student subscription allows), with Gemini as fallback and a deterministic fallback when neither is available. It only rewords insights and turns questions into a validated filter; it is never in the scoring path.
- **ML service auth:** the web app mints a short-lived signed token (`/api/ml-token`) only for signed-in users; the ML service verifies it (HMAC, expiry, role). Pipeline endpoints are admin-only. With no secret configured the service refuses protected calls.
- **Deploys:** web deploys on every push to Vercel (functions in Tokyo, next to Supabase). The ML service deploys through `deploy-ml.yml`: tests, then a ~3 MB code zip; heavy dependencies live on the server and reinstall only when `requirements.txt` changes.

## Tests and CI

- `services/ml`: 36 tests (normalisation, entity resolution, conflicts, scoring, matching accuracy on the demo set).
- `apps/mobile`: ESLint and TypeScript checks (`npm run lint`, `npm run typecheck`).
- GitHub Actions: web lint, typecheck and build; ML tests; secret scan; ML deploy to Azure.
- Vercel deploys every push to `main`.

## Known limitations

- Synthetic data: accuracy figures show the pipeline works, not performance at a real college.
- The ML service runs on one small Azure B1 machine. A cold pipeline run takes about 4 minutes there (about 25 seconds on a laptop); repeat runs on unchanged input reuse a cached result.
- Four fairness checks are marked "review needed" (see `/fairness`).
