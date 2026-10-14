# Ascora: presentation and Q&A brief

Everything here is checked against the code and the live system on 2026-10-14. Numbers come from the frozen synthetic demo cohort (1,200 students). Say "synthetic" whenever you quote an accuracy number.

Live: https://ascora-five.vercel.app · Mobile app in the browser: https://ascora-five.vercel.app/mobile

---

## 1. The 30-second pitch

Colleges already hold the signals that a student is slipping, but they sit in seven separate systems, and a red flag on its own changes nothing. Ascora joins those seven systems into one view of every student, gives a transparent 0 to 100 Success Score, flags academic risk and placement risk separately with plain-language reasons, and then turns each flag into a mentor action whose effect is measured. Tagline: **from early warning to real intervention**.

## 2. Architecture (draw this on one slide)

```
 7 campus files (CSV / Excel / JSON)
        │
        ▼
 ML + data service (FastAPI, Python 3.12, Azure App Service, Central India)
   ingest → standardise → match students → dedupe → resolve conflicts → unified view
   → features → Success Score → 2 risk models + SHAP → segments → insights → publish
        │  publishes through one token-gated database function (never holds the admin key)
        ▼
 Supabase Postgres (Tokyo) with row-level security on every table
        ▲                                   ▲
        │ user's own session (RLS)          │ same accounts and rules
 Web app: Next.js 15 on Vercel (Tokyo)     Mobile app: Expo / React Native
   dashboard, Student 360, planner,          (runs in the browser at /mobile; no APK yet)
   interventions, Ask Ascora
        │
        └── what-if, pipeline runs, Ask → ML service, with a short-lived signed token
 Azure OpenAI gpt-4.1-mini: wording only (insight sentences, question to filter). Never in scoring. Cached, with a plain-text fallback.
```

Why this split: all heavy maths lives in Python, the database enforces who sees what, and the web app stays a thin, fast reader.

## 3. The data pipeline, step by step (12 steps, visible on the Data integration page)

| Step | What it does | Number to quote |
|---|---|---|
| 1 Ingest | Reads 7 files; matches messy column headers to one schema by synonyms + fuzzy match; skips Excel title rows | 7 sources, 62,927 rows |
| 2 Standardise | 4 roll-number formats to 1 ID; 3 date formats unified; 0-10 scores rescaled to 0-100; impossible values blanked, never guessed | 5,782 LMS dates converted, 151 skill scores rescaled, 22 attendance values capped |
| 3 Match students | Exact on roll number; email-only sources matched by programme + name; name-only by branch + year with fuzzy names. Each link gets a confidence: ≥ 0.90 auto, 0.75 to 0.90 human review, below rejected | precision 1.00, recall 0.95 against planted ground truth (reproduced) |
| 4 Dedupe | Merges duplicate rows | |
| 5 Conflicts | When sources disagree, a written rule picks the winner (attendance register beats ERP; branch by majority) and both values are kept | 60 conflicts logged |
| 6 Unified view | One row per student, every value traceable to file, sheet and row | lineage on the Student 360 "Sources" tab |
| 7 Features | Trends (attendance Aug to Oct, LMS slope, internals vs own average), completion rates, etc. | |
| 8 Success Score | See section 4 | |
| 9 Risk models | Two calibrated LightGBM models + SHAP | AUC 0.881 / 0.802 |
| 10 Segments | KMeans on component scores and trends; clusters named by a transparent rule | 6 segments |
| 11 Insights | Cross-source findings (e.g. silent decliners), optional LLM wording | |
| 12 Publish | Writes to Supabase through one secret-protected function | |

## 4. Student Success Score

`0.30 Academic + 0.20 Placement + 0.15 Attendance + 0.15 LMS + 0.10 Skills + 0.10 Engagement`

- Each indicator becomes a cohort percentile first, so one extreme value cannot distort it and branches are comparable.
- Each active backlog subtracts 8 points from Academic (max 24).
- Feedback is deliberately excluded: a student who complains must not score lower.
- Missing data is treated as missing, not as zero.
- Stable: shifting every weight by ±5 points (12 scenarios) keeps rank correlation ≥ 0.997.
- Weights are in one config file, so a college can tune them.

## 5. Risk models and explanations

| | Academic risk | Placement risk |
|---|---|---|
| Predicts | failing a course or a new backlog | not placed by final year (placement-track students only) |
| Model | calibrated LightGBM vs logistic baseline | same |
| Held-out ROC-AUC | 0.881 (baseline 0.875) | 0.802 (baseline 0.806) |
| Precision at top 50 | 0.78 | 0.62 |

Say it straight: on this synthetic data the simple baseline is almost as good. We keep LightGBM for calibrated probabilities and per-student SHAP reasons. Precision at top 50 matters most because a mentor can only meet so many students a week.

Every flag shows its top reasons in plain words ("core attendance 62%, cohort median 78%"), marks which ones a mentor can act on, and shows the smallest change that would lower the risk (counterfactual "what helps").

Fairness: gender, residence, first-generation, lateral entry and schooling medium are never model inputs. A separate audit checks flag rates per group; 6 of 10 checks pass, 4 are marked "review needed" and are shown openly on the Fairness page.

## 6. From flag to action (problem understanding)

1. Overview and alerts show who needs help and why.
2. "This week" ranks whom to meet within the hours a mentor has (planner), one click to schedule.
3. Logging an intervention freezes the student's score and risk as a baseline.
4. The Interventions page tracks status and shows whether risk moved after completion. "What works" compares improvement rates per intervention type against similar students who got none.

## 7. Security and privacy

- Row-level security in the database: admin sees 1,200 students, a mentor sees only their own 64, a signed-out visitor sees none.
- The ML service never holds the database admin key; it publishes through one token-gated function.
- Contacts masked; profile views written to an audit log (append-only for app users).
- DPDP-aligned design (purpose limitation, minimisation, masking, audit). It is not a legal certification; say "aligned with", not "compliant".
- Student preview mode (pick a student on the login page) uses read-only synthetic files and stores that visitor's saved plans in their own browser cookie. It never opens the database to anonymous visitors.

## 9. Numbers cheat sheet

7 sources · 62,927 rows · 1,200 students · 21 mentors · matching precision 1.00 / recall 0.95 · 60 conflicts resolved by rule · score weights 30/20/15/15/10/10 · rank stability ≥ 0.997 · academic AUC 0.881 · placement AUC 0.802 · precision@50 0.78 / 0.62 · 6 segments · fairness 6/10 pass, 4 flagged for review · mentor sees 64 students.

## 10. Honest limits (say these before a judge does)

- Data is synthetic; accuracy shows the pipeline works, not real-college performance.
- No live university portal connection: CU Lucknow is an external link plus manual import.
- Android app is built and testable in the browser; no signed APK yet.
- Sample timetable and exam dates on the student schedule page are labelled as samples (no timetable source in the data).

---

## 11. Who presents what, and their likely questions

### Taqi: organiser and team lead (overall, every area)
**Presents:** the 30-second opening and the closing line only. Backup for any unanswered question. (The answers below are for whoever takes that question; most now go to Ujjwal and Ashmit.)
**Likely questions and answers:**
- *Why not one risk score?* Academic and placement risk have different causes and different fixes. Blending them hides who needs which help.
- *How do you know matching works?* The generator planted the true identity of every row. We compare: precision 1.00, recall 0.95; uncertain links go to a human review queue instead of being guessed.
- *Is LightGBM overkill?* On this data the baseline is close (0.875 vs 0.881). We report that. We keep the tree model for calibrated probabilities and SHAP reasons.
- *Leakage?* Features use only information before the outcome; held-out 25% test plus 5-fold CV.
- *Scale to a real college?* Pipeline runs per upload, publishes in batches, the web reads under RLS; heavy compute is isolated on the ML service.

### Ashmit Tiwari: brand and marketing (logo teaser, promo graphics, look and feel, USP)
**Presents:** slide 2 (what Ascora does and the USP), slide 5 (score, risk and segments) and slide 8 (limits and next steps). Learn sections 4, 5, 9 and 12 of this brief.
**Likely questions:**
- *What is your USP?* Most early-warning tools stop at the red flag. Ascora starts there: a reason, a plan, an owner, and a check on whether it worked.
- *Why this visual style?* Mentors use it every week: dark, calm, low noise, numbers with reasons next to them, nothing alarming in red unless it is real risk.
- *Who is the user?* HODs (whole campus), mentors (their own students), and students (their own planner view).

### Harsh Gupta: brand and marketing (promo graphics, theme and UI appeal, story)
**Presents:** slide 6 (explainability and trust) and drives and narrates the live demo (section 15). Learn sections 5, 7, 8 and 15.
**Likely questions:**
- *Is it accessible?* Automated WCAG 2.2 AA checks (axe-core) pass on the main pages in light and dark mode; keyboard focus and reduced motion are respected. No manual screen-reader test yet.
- *How do you protect students?* Scores support mentors and are never shown as labels; contacts are masked; every profile view is logged; sensitive attributes are never model inputs.
- *Why should a college trust it?* Every number links back to its source row and every flag shows its reasons.

### Lakshya Singh Parihar: development, frontend (with Taqi)
**Presents:** nothing on stage. Operates the laptop during the demo and keeps the offline backup (`npm run dev:offline`) ready.
**Likely questions:**
- *Stack?* Next.js 15 App Router, TypeScript, Tailwind 4, shadcn/ui, Recharts, TanStack Table, on Vercel.
- *How does the dashboard know what to show each user?* Server components read Supabase with the user's own session, so the database's row-level security filters rows; the UI never decides access.
- *How did you make it fast?* Functions run in Tokyo next to the database, the heavy cohort read is cached per user for two minutes (RLS still applies), visited tabs are reused for 30 seconds, and page transitions are pure CSS.

### Ujjwal Gupta: development, backend and mobile port
**Presents:** slide 3 (architecture), slide 4 (integration pipeline), and the mobile app in the demo. Learn sections 2, 3, 7 and 9, and the Taqi answers on matching and leakage.
**Likely questions:**
- *Is the mobile app real?* Yes, Expo / React Native, same Supabase accounts and RLS. It runs in the browser at /mobile; a signed APK has not been produced yet.
- *How does the web talk to the ML service securely?* The web mints a short-lived signed token for the signed-in user; the FastAPI service checks it and the role before what-if, Ask or pipeline runs.
- *Where does it run?* Web on Vercel, database on Supabase, ML on Azure App Service (Central India), language model on Azure OpenAI.
- *What if the ML service is down?* Precomputed scores and reasons stay visible; what-if shows a clear "service offline" message; there is a full offline demo mode for bad Wi-Fi.

---


---

## 12. Hard questions: answer in under 20 seconds

- **"Your data and labels are synthetic. Aren't the accuracy numbers circular?"** Yes, they only prove the pipeline works end to end. The product is the pipeline: messy files in, matched students, an explainable score, and actions out. A college plugs in its own past outcomes, the models retrain in one run, and the thresholds are re-checked on the Model page. We report the simple baseline next to LightGBM so nobody is misled.
- **"Why trust the matching?"** Uncertain links are never guessed. They go to a human review queue with a confidence, and every value shows its source file and row.
- **"Why these risk cut-offs?"** High is where flags are usually right, so mentor time goes to real cases. Medium is wider for light follow-up. Both live in one config file (the Model page shows the numbers).
- **"What about bias?"** Sensitive attributes are never inputs. We audit flag rates per group, and 4 of 10 checks are openly marked for review rather than hidden.

## 13. Demo-day checklist (do it 1 hour before)

1. Open https://ascora-five.vercel.app in a fresh incognito window and sign in as admin, then as mentor. Click every sidebar tab once (this also warms the server cache).
2. Open one student, plan an intervention, mark it Done.
3. Open /mobile and launch the app.
4. Keep `npm run dev:offline` ready on a laptop in case the venue Wi-Fi fails.
5. Keep the demo to 4 moments: overview, one student's reasons, plan an intervention, segments.

---

## 14. Slide plan (8 slides, about 6 minutes), mapped to the rubric

| # | Slide | Speaker | Rubric it earns | Say this |
|---|---|---|---|---|
| 1 | Problem | Taqi (30 seconds, opening only) | Problem understanding 10 | Signals of a slipping student sit in 7 systems; flags alone do not change outcomes (Course Signals lesson). |
| 2 | What Ascora does and the USP | Ashmit | Problem understanding | One view of every student, a score you can read, two separate risks, and a loop from flag to action to measured result. |
| 3 | Architecture | Ujjwal | Data integration 30 | Section 2 diagram: 7 files, the Python pipeline, Supabase with RLS, web and mobile, where each part runs. |
| 4 | Integration pipeline | Ujjwal | Data integration 30 | 12 steps, match quality 1.00 / 0.95 with a review queue, 60 conflicts by rule, lineage to file and row. |
| 5 | Score, risk and segments | Ashmit | Score and risk 25 + segmentation bonus | Formula 30/20/15/15/10/10, stable at ≥ 0.997, two models with baseline shown, threshold rationale, 6 segments with actions. |
| 6 | Explainability and trust | Harsh | Dashboard 25 + explainable bonus | SHAP reasons in plain words, what-helps counterfactuals, fairness audit, RLS, masking, audit log. |
| 7 | Live demo | Harsh drives and narrates, Ujjwal shows mobile, Lakshya operates the laptop / backup offline mode | Dashboard 25, demo 10 | Section 15 flow. |
| 8 | Honest limits and next steps | Ashmit, closing line by Taqi | Presentation 10 | Synthetic data, recalibration on real history, APK next, CU portal via official export. |

Q&A routing: data, pipeline, backend, mobile, security → **Ujjwal**. Score, models, USP, business value → **Ashmit**. Dashboard, explainability, privacy, accessibility, demo → **Harsh**. Taqi steps in only if a question is left unanswered. Lakshya takes no questions unless asked directly about the frontend.

## 15. Demo video and live demo shot list (about 3 minutes)

| Time | Screen | Show | Line |
|---|---|---|---|
| 0:00 | Landing | Intro, hero | "Ascora: from early warning to real intervention." |
| 0:10 | Data integration | Pipeline steps, match quality, conflicts | "Seven messy sources become one student record, with every value traceable." |
| 0:35 | Overview | Counts, risk by branch, heatmap, agenda | "A head of department sees the whole campus at a glance." |
| 0:55 | Students table | Filter High academic risk, sort by priority | "Who needs help first." |
| 1:10 | Student 360 | Score breakdown, both risks, reasons, what helps, sources tab | "Every flag explains itself." |
| 1:40 | Plan intervention, then Interventions | Suggested type, baseline, status Done | "The flag becomes an action we can measure." |
| 2:00 | This week | Hours slider, ranked meetings, Schedule | "A realistic plan for a mentor's week." |
| 2:15 | Segments | Silent decliners, recommended action | "Groups that need different kinds of help." |
| 2:30 | Score and models | Formula, AUC with baseline, thresholds, fairness | "Nothing is a black box." |
| 2:45 | Mentor login | Same app shows only their 64 students | "Access is enforced by the database." |
| 2:55 | /mobile | Launch the app | "The same data on a mentor's phone." |

## 16. Making the demo video for free

Cheapest and most reliable: record the screen yourself (OBS Studio, or the built-in Windows recorder with Win+Alt+R) while one person follows section 15 and narrates live. Then trim it in any free editor. This costs nothing and no AI credits.

Open Montage (installed skills `playwright-recording`, `hyperframes`, `ffmpeg`) can also do it free, because it runs locally: Playwright records a scripted browser walkthrough, HyperFrames adds title cards, and ffmpeg joins them. The catches: narration would need a paid text-to-speech API or your own recorded voice, and the scripted recording needs the signed-in demo login typed into the script by you. It takes more setup than a manual recording. Use it only for a short polished intro clip, not the whole demo.
