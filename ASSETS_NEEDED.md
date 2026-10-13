# Assets needed

Drop files into `apps/web/public/assets/` with the listed filename. Until then the app uses a neutral placeholder. Nothing here is fetched or invented.

| ID | Type | Where used | Exact spec | What it should show | Priority | Status |
|---|---|---|---|---|---|---|
| A-01 | Logo (DONE: supplied, in `assets/brand`, wired into login, sidebar, icons) | `components/brand.tsx` (sidebar, login, mobile header) | `logo.svg` (mark + wordmark), plus `logo-dark.svg`; transparent background; square mark readable at 32x32 | The Ascora mark. Suggested idea: an upward step or path that continues past a flag | Must | Placeholder "A" tile |
| A-02 | Favicon / app icon (DONE: generated from the supplied mark) | `src/app/favicon.ico`, PWA icon | `favicon.ico` 32x32; `icon-512.png` 512x512 and `icon-192.png`, transparent or brand-blue background | The logo mark only | Must | Next.js default |
| A-03 | Illustration (x4) | `EmptyState` component (students, interventions, data, ask) | `empty-students.svg`, `empty-interventions.svg`, `empty-data.svg`, `empty-ask.svg`; 240x160, transparent, light and dark variants (`-dark.svg`) | Calm, line-style scenes: a roster with a magnifier; a checklist with a flag; files flowing into one stack; a speech bubble with sparkles | Nice | Lucide icon placeholders |
| A-04 | Image | Login page left panel (`app/login/page.tsx`) | `login-visual.webp`, 1200x1600, under 250 KB, works on a light neutral background | A calm campus or a mentor and student in conversation. No readable faces required; avoid stock-photo clichés | Nice | Text-only panel |
| A-05 | Image (DONE: social preview generated from the supplied logo) | Social preview (`metadata.openGraph`) | `og-image.png`, 1200x630 | Ascora name, tagline "From early warning to real intervention", a dashboard crop | Must | None |
| A-06 | Video | Landing/demo slot, `docs/demo-script.md` backup | `demo-trailer.mp4`, 1920x1080, 60-90 s, H.264, under 30 MB, captions burned in; plus `demo-trailer-vertical.mp4` 1080x1920 for social | The story in docs/demo-script.md. Can be produced with the Remotion project in `motion/` once the logo exists | Nice | `motion/` has a placeholder intro |
| A-07 | Screenshots | Pitch deck | `screens/overview.png`, `student-360.png`, `data-integration.png`, `segments.png`, 2x resolution, light mode, cropped to the content area | The real screens, after the logo is in | Must | To capture |
| A-08 | Audio | Demo trailer | `trailer-bed.mp3`, 60-90 s, no vocals, royalty-free with licence file | Understated, optimistic instrumental | Nice | None |
