# Handoff log

One line per finished or in-progress task. Newest at the bottom. Format: `date | agent | task | branch | status / result`.

2026-10-13 | claude | Phases 0-4 built (data, integration, intelligence, dashboard), Supabase + Vercel live, CI green | main | done
2026-10-13 | claude | Azure ML service (ascora-ml in ascora-rg, Central India, B1) | main | superseded by the next line
2026-10-13 | claude | Azure ML service live (https://ascora-ml.azurewebsites.net, ascora-rg, Central India B1), CI/CD deploy-ml.yml, Vercel pointed at it | main | done
2026-10-13 | claude | WIP branch claude/ml-auth-cache: ML token auth, result cache, parallel publish, faster CI, logo assets, Azure OpenAI wiring. NOT merged: web must mint tokens first (see below) | claude/ml-auth-cache | merged
2026-10-13 | claude | Merged claude/ml-auth-cache: ML token auth, pipeline cache, parallel publish, faster CI/CD, logo, Azure OpenAI | main | done
2026-10-13 | gemini | Ascora mobile companion (apps/mobile): Expo, React Native, Voice AI tab, browser simulator, live Supabase RLS | gemini/mobile-app | done, PR opened
2026-10-13 | gemini | Mobile app UX polish: ScoreRing scaling fix, onboarding welcome screen, Platform Hub tab, synthesized audio engine, scrollbar suppression, lint/typecheck clean | gemini/mobile-app | done, PR #1 updated
2026-10-13 | gemini | Fix offline sign-out crash when Supabase client env vars are absent: apps/web/src/components/user-menu.tsx | gemini/fix-offline-signout | done
2026-10-13 | gemini | Mobile app complete fix: official mark.png branding across screens, Supabase URL fallback crash guard, lint/typecheck clean | gemini/mobile-app | done
