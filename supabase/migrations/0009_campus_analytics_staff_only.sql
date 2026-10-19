-- Migration 0009: campus-wide analytics are staff-only.
-- These tables had `using (true)` for every signed-in user, so a student (or any account without a profile) could read
-- campus aggregates, segment definitions, quality reports and cached LLM wording. Only staff screens use them.
-- `mentors` stays readable: a student's own page shows their mentor's name.

drop policy if exists "segments readable" on public.segments;
drop policy if exists "insights readable" on public.insights;
drop policy if exists "artifacts readable" on public.analytics_artifacts;
drop policy if exists "quality readable" on public.data_quality_log;
drop policy if exists "llm cache readable" on public.llm_cache;

create policy "segments staff" on public.segments for select to authenticated using (private.is_staff());
create policy "insights staff" on public.insights for select to authenticated using (private.is_staff());
create policy "artifacts staff" on public.analytics_artifacts for select to authenticated using (private.is_staff());
create policy "quality staff" on public.data_quality_log for select to authenticated using (private.is_staff());
create policy "llm cache staff" on public.llm_cache for select to authenticated using (private.is_staff());
