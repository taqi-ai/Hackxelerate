-- Migration 0008: interventions are staff records.
-- 0006 widened private.can_see_student() so a student can see their own rows. The intervention policies reuse that
-- helper, so a signed-in student could read, create and update staff intervention records about themselves (found by
-- supabase/tests/rls_isolation.sql). Interventions now require a staff role as well.

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'mentor'));
$$;
revoke all on function private.is_staff() from public, anon;
grant execute on function private.is_staff() to authenticated;

drop policy if exists "interventions read" on public.interventions;
drop policy if exists "interventions insert" on public.interventions;
drop policy if exists "interventions update" on public.interventions;

create policy "interventions read" on public.interventions for select to authenticated
  using (private.is_staff() and private.can_see_student(student_id));
create policy "interventions insert" on public.interventions for insert to authenticated
  with check (private.is_staff() and private.can_see_student(student_id) and created_by = auth.uid());
create policy "interventions update" on public.interventions for update to authenticated
  using (private.is_staff() and private.can_see_student(student_id))
  with check (private.is_staff() and private.can_see_student(student_id));
