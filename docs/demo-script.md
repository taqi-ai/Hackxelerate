# Demo script (about 5 minutes) and what to record

**Setup before you start**
- Primary: https://ascora-five.vercel.app (sign in as admin).
- Backup 1: local offline mode (`npm run dev:offline` in `apps/web`), no internet needed.
- Backup 2: the screen recording below.
- Demo accounts: `admin@ascora.test` and `mentor@ascora.test`, password shown on the login page.

## Story

1. **Data integration (admin, Data integration).** "Seven campus systems, none agree on how to identify a student." Press Run on demo data. Point at the steps: roll formats normalised, fuzzy matching, duplicates merged, conflicts found. Show matching precision 100% and recall 95% against ground truth, and the review queue: "Ambiguous links never feed scores until a person confirms them."
2. **Overview.** Cohort health, then the top insight: "63 silent decliners hidden behind average scores." Open the hackathon insight.
3. **Student 360.** Open a student with a good CGPA flagged as a silent decliner. Read the plain-language drivers, then the "smallest changes that help". Move a what-if slider and watch risk update from the live model.
4. **Close the loop.** Plan an intervention (type is pre-suggested from the top driver). Switch to the mentor account and show "Who to meet this week": enter 3 hours and see the ranked list.
5. **Segments.** "High academics, low placement readiness" with its recommended action.
6. **Transparency.** Score and models: formula and weights, the stability table (rank correlation 0.997), model metrics, early-warning curve. Then Fairness: be upfront that four checks are marked for review.
7. **Closing line.** "Most early-warning systems stop at the red flag. Ascora is built for what happens after it."

## Judge questions to expect

- *Why not just a dashboard?* Because the product's centre is the action after the flag (interventions with a baseline, mentor time planner, what-works analysis).
- *Is the AI accurate?* On synthetic data, AUC 0.88 academic and 0.80 placement; a logistic baseline is nearly as good, and we say so. The value is calibrated, explainable risk plus the workflow.
- *Privacy?* Database-enforced roles, masked contacts, audit log, no students-facing labels, DPDP-minded design.
- *Does it work on our real data?* The pipeline auto-maps headers and handles messy formats; real deployment needs retraining on the college's own outcomes.

## What to capture for the backup screen recording

Record at 1080p, light mode first, then 20 seconds in dark mode.

- [ ] Login with each demo account (show the demo hints)
- [ ] Data integration: click Run, let all steps finish, scroll the match-confidence histogram and conflicts table
- [ ] Overview, scrolling slowly past all panels
- [ ] A Student 360: drivers, counterfactual, what-if slider moving, Plan intervention
- [ ] Mentor "This week" with the hours slider moving from 2h to 6h
- [ ] Segments page, one card's "Open members"
- [ ] Ask Ascora: two example questions
- [ ] Score and models, then Fairness
- [ ] Phone-size view of Overview and a Student 360 (browser device mode)
