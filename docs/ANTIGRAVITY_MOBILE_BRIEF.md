# Ascora mobile app: build brief for Antigravity

You are building the **Ascora mobile companion** (Expo, React Native) inside this repo. Another agent (Claude) owns everything else. Follow this brief literally. Do not improvise scope, do not "improve" other folders.

## Hard rules

1. Work **only** inside a new folder `apps/mobile/`. Never edit, move or delete anything outside it, especially `apps/web`, `services/ml`, `supabase`, `docs`, `.github`, `CLAUDE.md`.
2. Never create, change or run database migrations. Never run SQL. The mobile app is a **client** of the existing Supabase project.
3. Never print, hard-code or commit secrets. Read config from `apps/mobile/.env` (gitignored) using `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Copy the values from `apps/web/.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`). The anon key is public by design; the service-role key must never appear anywhere in `apps/mobile`.
4. Do not touch Azure, Vercel or GitHub settings. Do not commit or push; leave changes in the working tree for the user to review.
5. No invented data. Every number on screen comes from Supabase. If a query fails or returns nothing, show an honest empty or error state. No lorem ipsum, no fake students, no hard-coded scores.
6. The students are a **generated sample cohort**. Say that in Settings and About. Never call anything "demo" in the UI.
7. No em-dashes in any user-facing text.
8. Windows machine, Node 22, npm. Use `npx expo`, not global installs.

## Goal

A phone-sized app a faculty mentor or head of department uses on the go: see who needs attention, open a student, log or update an intervention, check this week's plan. It must run (a) on a real phone through **Expo Go** and (b) **in the browser inside a phone-shaped frame** so the user can test without a device.

## Stack

- Expo SDK (latest stable), TypeScript, **expo-router** (file-based routing).
- `react-native-web` + `react-dom` for the browser build (`npx expo start --web`).
- `@supabase/supabase-js` with `@react-native-async-storage/async-storage` for the session; `detectSessionInUrl: false`, `autoRefreshToken: true`.
- `react-native-reanimated` + `react-native-gesture-handler` (required by expo-router templates), `expo-haptics`, `expo-linear-gradient`, `react-native-svg`, `@expo/vector-icons` (Feather icons).
- `@shopify/flash-list` is optional; plain `FlatList` is fine for 64 to 1,200 rows with pagination.
- No UI kit. Hand-build components to match the design tokens below.

Create it with: `npx create-expo-app@latest apps/mobile --template default` (then delete the sample screens). Add `apps/mobile/.gitignore` entries for `.env`, `.expo`, `node_modules`, `dist`.

## Design system (match the web app)

Dark first, light supported (follow system via `useColorScheme`, plus a toggle in Settings).

| Token | Dark | Light |
|---|---|---|
| background | `#07070b` | `#f6f6fb` |
| card | `#0e0e15` | `#ffffff` |
| card border | `rgba(255,255,255,0.08)` | `rgba(20,20,40,0.08)` |
| text | `#f4f4f8` | `#14141f` |
| muted text | `rgba(244,244,248,0.55)` | `rgba(20,20,31,0.55)` |
| brand (periwinkle) | `#a9b4f5` | `#5560c9` |
| risk high | `#f0786e` | `#c8372d` |
| risk medium | `#e8b84f` | `#a8730a` |
| risk low | `#6fcf97` | `#1f8a4c` |

- Fonts: Bricolage Grotesque (headings, via `@expo-google-fonts/bricolage-grotesque`) and the system font for body. Fall back to system if fonts fail to load.
- Radius 20 for cards, 999 for pills. 16 px screen gutters. 44 px minimum touch targets. Subtle haptic on primary actions (not on web).
- Motion: short springs (reanimated), fade-and-rise on list items, count-up on the big numbers. Respect reduce-motion (`AccessibilityInfo.isReduceMotionEnabled`).
- Brand assets: copy from `assets/brand/` and `apps/web/public/assets/` into `apps/mobile/assets/` (`mark.png`, `icon-512-transparent.png`, `logo-dark.webp`). Use the transparent icon as the app icon and adaptive icon foreground on `#07070b`. Never generate or download other assets.

## Data (read-only facts about the existing database)

Auth: Supabase email and password (`supabase.auth.signInWithPassword`). Two shared accounts exist for everyone reviewing the product: `admin@ascora.test` (role admin, sees all 1,200 students) and `mentor@ascora.test` (role mentor, sees only their assigned students). The shared password is shown on the web login page under "Quick sign-in"; show the same two quick-fill buttons on the mobile sign-in screen. Row Level Security already restricts what each account can read. **Do not re-implement access control in the client.**

Tables you may read (all via `supabase.from(...)`):

- `profiles`: `id, full_name, role ('admin'|'mentor'), mentor_id` (select the row where `id = auth user id`).
- `students`: `id (text, e.g. CU24AIML0039), name, email, branch, year, section, mentor_id`. Email and phone must be shown **masked** (first 2 letters, then dots, then domain; phone last 2 digits). Reuse the logic in `apps/web/src/lib/format.ts` (`maskEmail`, `maskPhone`). Never show a raw contact detail.
- `student_scores`: `student_id, success_score (0-100), components {academic, placement, attendance, lms, skills, engagement}, academic_risk_prob, academic_risk_level ('Low'|'Medium'|'High'), placement_risk_prob, placement_risk_level ('Low'|'Medium'|'High'|'N/A'), intent, segment_id, persona, shap_academic, shap_placement, alerts [{type,text}], recourse, priority, metrics`. Join to `students` with `students!inner(name, branch, year, section, mentor_id)` as the web app does in `apps/web/src/lib/data.ts` (`ROW_COLS`, `toRow`).
- `lms_activity`: `student_id, weekly [{week, logins, due, submitted, minutes}]` (weeks 1 to 12).
- `interventions`: `id, student_id, type, driver, owner_name, due_date, status ('open'|'in_progress'|'done'|'cancelled'), notes, baseline, created_at, updated_at`. Insert and update are allowed by RLS for signed-in users on students they can see. Copy the shape of the insert from `apps/web/src/app/(app)/actions.ts` (types: `mentor_meeting, peer_tutoring, mock_interview, counselling_referral, parent_call, skill_workshop`). Store `baseline` = `{success_score, academic_risk_prob, placement_risk_prob}` at creation.
- `insights`, `segments`, `analytics_artifacts` (key `cohort`): optional, for the Home screen.

PostgREST returns at most 1,000 rows per request: page with `.range(from, to)` (see `fetchAll` in `apps/web/src/lib/data.ts`). On mobile prefer server-side filtering, ordering and pagination of 50 rows at a time rather than loading everything.

Read these web files for the exact logic and wording, and port (do not import) what you need: `apps/web/src/lib/types.ts`, `format.ts`, `data.ts`, `apps/web/src/app/(app)/this-week/planner.tsx` (weekly plan greedy selection), `apps/web/src/app/(app)/students/[id]/page.tsx` (what a Student 360 shows).

## Screens (expo-router)

```
app/
  _layout.tsx            auth gate + theme + fonts
  sign-in.tsx
  (tabs)/
    _layout.tsx          bottom tabs: Home, Students, This week, Settings
    index.tsx            Home
    students.tsx
    this-week.tsx
    settings.tsx
  student/[id].tsx       Student 360 (stack screen)
  about.tsx
```

1. **Sign-in**: logo, email, password, inline validation, error text, two "Quick sign-in" role buttons that fill the form. After sign-in go to Home. Persist the session so reopening the app stays signed in.
2. **Home**: greeting by time of day (Asia/Kolkata) and first name; a "Campus intelligence" gradient card with one summary sentence (counts of high academic risk and silent decliners computed from the data); 4 stat tiles (students, average score, high academic risk, high placement risk); "Meet first" list of the 5 highest `priority` students; a horizontal 6-day week strip with due interventions as cards (overdue in red). Pull to refresh.
3. **Students**: search box (name or id, debounced), filter chips (High academic risk, High placement risk, Silent decliners), list rows with score, name, branch/year/section, risk pill. Paginate with infinite scroll. Tap opens Student 360.
4. **Student 360**: header with name, id, branch, a score ring (react-native-svg, animated), risk pills, masked contact line; alert banner when `alerts` is non-empty; segmented control with tabs **Why flagged** (SHAP drivers in plain language, mark which ones a mentor can act on, exactly as the web `DriverList`), **What helps** (`recourse` items), **This semester** (12-week LMS logins as a small bar chart), **Interventions** (list plus "Plan intervention" bottom sheet: type, due date, notes; type pre-suggested from the top driver using `suggestIntervention` from `format.ts`). Marking an intervention done or in progress updates the row.
5. **This week**: hours slider 1 to 10 (default from Settings), plan built with the same greedy knapsack as `planner.tsx`, list with minutes per student and suggested intervention, "Log" button per row.
6. **Settings**: profile card (name, role, access scope), theme (system, light, dark), reduce motion, default weekly hours (stored in AsyncStorage), sound/haptics toggle, "Sign out", and an "About" link.
7. **About**: "Ascora, built for KPMG in India's Smart Campus Analytics challenge at HacXLerate 2026 by byteXL." Team: Taqi (Team Lead), Ashmit Tiwari, Ujjwal Gupta, Harsh Gupta, Lakshya Singh Parihar. "B.Tech AIML, 2nd year, Sem 3, CU UP campus." One line: "The students shown are a generated sample cohort. No real student data is used."

Every screen needs: loading skeletons (not spinners alone), an empty state, an error state with Retry, and no layout jump when data arrives.

## Browser simulator (so the user can test without a phone)

1. `npx expo install react-native-web react-dom @expo/metro-runtime` and set `"web": { "bundler": "metro" }` in `app.json`.
2. Add `apps/mobile/app/+html.tsx` (expo-router web root) that renders the app and a CSS wrapper: on viewports wider than 520 px, centre the app in a **390 x 844 rounded phone frame** (border radius 44, 10 px dark bezel, soft shadow, dark page background, `overflow: hidden`), with a small notch pill at the top. On narrow viewports render full-screen with no frame. Provide a `Device` switcher in the page margin (not inside the app) for 390x844 (iPhone), 360x800 (Android), 768x1024 (tablet) that only changes the frame size.
3. Gate native-only APIs: `expo-haptics` calls must no-op on web; `Platform.OS === "web"` fallbacks for anything else.
4. Scripts in `apps/mobile/package.json`:
   - `"web": "expo start --web --port 8082"`
   - `"start": "expo start"` (shows the QR code for Expo Go)
   - `"start:tunnel": "expo start --tunnel"` (for when the phone is on another network)
   - `"typecheck": "tsc --noEmit"`
   - `"lint": "expo lint"`
5. Write `apps/mobile/README.md` with: install (`npm install`), env setup (copy `.env.example`, which lists only the two variable names with empty values), run in browser (`npm run web`, open `http://localhost:8082`), run on phone (install **Expo Go**, `npm start`, scan the QR; phone and laptop on the same Wi-Fi, or use `npm run start:tunnel`), and a sample-cohort disclaimer.

## Definition of done (verify, then report)

You must actually run these and paste the results, not just claim them:

- `npm install` succeeds with no peer-dependency errors.
- `npm run typecheck` and `npm run lint` pass with zero errors.
- `npm run web` starts; in the browser: sign in with the mentor quick button, Home shows real counts, Students lists and searches, Student 360 opens for `CU24AIML0039` (Arjun Gupta) with a score ring and drivers, planning an intervention creates a row and it shows in the list, This week updates when the slider moves, theme toggle works, sign out returns to Sign-in.
- Repeat sign-in with the admin button: Students shows more rows than the mentor.
- Browser console has **zero errors**; no network call to anything except the Supabase project URL.
- App works in light and dark mode; no text clipped at 360 px width; every touch target is at least 44 px.
- `npm start` prints a QR code and the app opens in Expo Go on the same Wi-Fi.
- A short **Known gaps** list (anything not done or not verified, stated plainly).

## What not to build

No push notifications, no offline sync, no file uploads, no data-pipeline controls, no model-fairness screens, no admin tools. Those stay in the web app.

## When something is unclear

Prefer the behaviour of the web app (`apps/web`) over your own judgement. If the web app does not answer it, choose the simplest option and list it under Known gaps. Do not ask the user for credentials and do not paste any key into chat or files other than `apps/mobile/.env`.
