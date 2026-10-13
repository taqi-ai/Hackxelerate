-- Move RLS helper functions out of the exposed `public` API schema into `private`
-- (Supabase advisor 0028/0029), and restrict the token-gated ingest RPCs to the anon key only.

grant usage on schema private to authenticated;
revoke all on all tables in schema private from anon, authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function private.my_mentor_id() returns text
language sql stable security definer set search_path = public as $$
  select mentor_id from public.profiles where id = auth.uid();
$$;

create or replace function private.can_see_student(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_admin()
      or exists (select 1 from public.students s where s.id = sid and s.mentor_id = private.my_mentor_id());
$$;

revoke all on function private.is_admin(), private.my_mentor_id(), private.can_see_student(text) from public, anon;
grant execute on function private.is_admin(), private.my_mentor_id(), private.can_see_student(text) to authenticated;

-- recreate policies against the private helpers
drop policy "own profile or admin" on public.profiles;
create policy "own profile or admin" on public.profiles for select to authenticated using (id = auth.uid() or private.is_admin());

drop policy "students by role" on public.students;
create policy "students by role" on public.students for select to authenticated
  using (private.is_admin() or mentor_id = private.my_mentor_id());

drop policy "links by role" on public.source_links;
create policy "links by role" on public.source_links for select to authenticated using (private.can_see_student(student_id));
drop policy "academic by role" on public.academic;
create policy "academic by role" on public.academic for select to authenticated using (private.can_see_student(student_id));
drop policy "attendance by role" on public.attendance;
create policy "attendance by role" on public.attendance for select to authenticated using (private.can_see_student(student_id));
drop policy "lms by role" on public.lms_activity;
create policy "lms by role" on public.lms_activity for select to authenticated using (private.can_see_student(student_id));
drop policy "engagement by role" on public.engagement;
create policy "engagement by role" on public.engagement for select to authenticated using (private.can_see_student(student_id));
drop policy "placement by role" on public.placement;
create policy "placement by role" on public.placement for select to authenticated using (private.can_see_student(student_id));
drop policy "skills by role" on public.skills;
create policy "skills by role" on public.skills for select to authenticated using (private.can_see_student(student_id));
drop policy "feedback by role" on public.feedback;
create policy "feedback by role" on public.feedback for select to authenticated
  using ((student_id is null and private.is_admin()) or private.can_see_student(student_id));
drop policy "conflicts by role" on public.conflicts;
create policy "conflicts by role" on public.conflicts for select to authenticated using (private.can_see_student(student_id));
drop policy "scores by role" on public.student_scores;
create policy "scores by role" on public.student_scores for select to authenticated using (private.can_see_student(student_id));
drop policy "uploads admin" on public.raw_uploads;
create policy "uploads admin" on public.raw_uploads for select to authenticated using (private.is_admin());

drop policy "interventions read" on public.interventions;
create policy "interventions read" on public.interventions for select to authenticated using (private.can_see_student(student_id));
drop policy "interventions insert" on public.interventions;
create policy "interventions insert" on public.interventions for insert to authenticated
  with check (private.can_see_student(student_id) and created_by = auth.uid());
drop policy "interventions update" on public.interventions;
create policy "interventions update" on public.interventions for update to authenticated
  using (private.can_see_student(student_id)) with check (private.can_see_student(student_id));
drop policy "audit read admin" on public.audit_log;
create policy "audit read admin" on public.audit_log for select to authenticated using (private.is_admin());

drop function public.can_see_student(text);
drop function public.my_mentor_id();
drop function public.is_admin();

-- ingest RPCs: called by the ML service with the anon key + secret token; signed-in users don't need them
revoke execute on function public.ascora_ingest(text, text, jsonb) from authenticated;
revoke execute on function public.ascora_reset(text, boolean) from authenticated;

-- mentors may log interventions; everyone signed-in may write their own audit entries (already covered)
