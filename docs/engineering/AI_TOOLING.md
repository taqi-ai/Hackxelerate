# AI tooling inventory

| Tool | Source | Status | Audit notes |
|---|---|---|---|
| taste-skill, frontend-design, web-design-guidelines, find-skills, Superpowers skills (brainstorming, TDD, debugging, verification and others) | user-installed in `~/.claude/skills` | installed as skills | Superpowers is present as a skills folder; not verified as the marketplace plugin |
| OpenMontage: hyperframes, motion-graphics, playwright-recording, ffmpeg | calesthio/openmontage (AGPL-3.0) | installed via `npx skills add` | instruction files only; skills that need paid APIs were deliberately not installed |
| Ponytail plugin | DietrichGebert/ponytail v5.3.2 (MIT) | **NOT installed**: slash commands cannot be run from this session | Hooks run local Node scripts only (SessionStart, SubagentStart, UserPromptSubmit). It writes a per-turn ledger CSV under `~/.config/ponytail/band/`. The optional webhook is empty by default, so nothing leaves the machine. Install it yourself with two separate commands: `/plugin marketplace add DietrichGebert/ponytail`, then `/plugin install ponytail@ponytail`. |
| security-guidance plugin | claude-plugins-official | not installed (same reason) | `/plugin install security-guidance@claude-plugins-official` |
| Supabase agent skills | supabase/agent-skills | not installed yet | candidate for the RLS test work |
