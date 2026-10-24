# Accessibility

Target: WCAG 2.2 AA. Automated checks only so far; no audit with screen-reader users yet.

## Latest automated audit (2026-10-20)
axe-core (rules `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) on a production build in offline mode
(`npm --prefix apps/web run start:offline -- -p 3001`), 1440x900, dark and light themes.

| Pages | Result |
|---|---|
| `/`, `/product`, `/mobile`, `/login`, `/join` | no violations |
| `/overview`, `/this-week`, `/students`, `/students/<id>`, `/students/<id>/report`, `/segments` | no violations |
| `/interventions`, `/ask`, `/model`, `/fairness`, `/data`, `/accounts`, `/settings` | no violations |
| `/student`, `/student/academics`, `/student/calculator`, `/student/schedule`, `/student/connection` (preview cookie) | no violations after the fixes below |

Found and fixed in the student portal: two dropdowns with no accessible name (attendance planner subject, subject sort),
and `text-brand-foreground` used on 11 controls without the token existing, so text inherited its colour (1.64:1 on the
brand colour in dark mode). `--brand-foreground` is now defined for both themes.

## Keyboard
Playwright test `keyboard only: skip link, dialog open and close, focus always visible` (CI): the first Tab reaches
"Skip to content", which moves past the navigation; the intervention dialog opens with Enter, closes with Escape and
returns focus to its button; each of the next 25 tab stops shows a focus indicator. A probe over 40 tab stops on four
pages found one gap, tab panels (focusable by design) with their outline removed; they now show a focus ring.

Not covered: signed-in views against the live database, screen-reader walkthroughs, and zoom to 400%.

A first attempt measured Next.js error pages (the server was started outside `apps/web`, so the snapshot was not found,
and every page returned 500). Those results were discarded; the table above is from the corrected run, where every page
returned 200.

## Practices in the code
Labels on every form field, `role="alert"` on form errors, visible focus rings, `prefers-reduced-motion` respected by the
intro and page transitions, colour never the only signal (stale data says "stale", risk levels are written out).

## 2026-10-24: Mission Control and Evaluation data tab
axe-core 4.10.2 (WCAG 2.0/2.1/2.2 A and AA tags), run in the browser pane against the offline production build: `/mission-control` in dark and light themes, and `/model` with the Evaluation data tab open: 0 violations. Automated testing only: no screen-reader or keyboard walkthrough of Mission Control was done.
