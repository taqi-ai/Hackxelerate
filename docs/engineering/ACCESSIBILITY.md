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

Not covered by this run: the student portal pages (they need the preview cookie), signed-in views against the live
database, keyboard-only and screen-reader walkthroughs, and zoom to 400%.

A first attempt measured Next.js error pages (the server was started outside `apps/web`, so the snapshot was not found,
and every page returned 500). Those results were discarded; the table above is from the corrected run, where every page
returned 200.

## Practices in the code
Labels on every form field, `role="alert"` on form errors, visible focus rings, `prefers-reduced-motion` respected by the
intro and page transitions, colour never the only signal (stale data says "stale", risk levels are written out).
