-- Migration 0010: institutions (tenancy, expand step).
-- Every tenant-owned row gets an institution_id; all existing rows belong to the default institution (the synthetic
-- evaluation campus), so behaviour is unchanged today. Access helpers and policies additionally require the row's
-- institution to match the caller's, so an admin is an admin of their own institution only.
-- Follow-up (contract step, see docs/engineering/PRODUCTIONIZATION_PLAN.md): institution-scoped keys for students and
-- artifacts, and an institution parameter on the publish RPC.

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now()
);
alter table public.institutions enable row level security;

insert into public.institutions (id, slug, name)
values ('00000000-0000-4000-8000-0000000000a1', 'ascora-evaluation', 'Ascora evaluation campus (synthetic data)')
on conflict (id) do nothing;



do $$
declare t text;
begin
  foreach t in array array['profiles','mentors','students','segments','insights','analytics_artifacts',
                           'data_quality_log','llm_cache','raw_uploads','audit_log','feedback'] loop
    execute format('alter table public.%I add column if not exists institution_id uuid not null
                    default ''00000000-0000-4000-8000-0000000000a1'' references public.institutions(id)', t);
    execute format('create index if not exists %I on public.%I (institution_id)', 'idx_' || t || '_institution', t);
  end loop;
end $$;

-- caller's institution (null for anonymous / profile-less callers, which then match nothing)
create or replace function private.my_institution() returns uuid
language sql stable security definer set search_path = public as $$
  select institution_id from public.profiles where id = auth.uid();
$$;
revoke all on function private.my_institution() from public, anon;
grant execute on function private.my_institution() to authenticated;

create policy "institution members read own institution" on public.institutions for select to authenticated
  using (id = private.my_institution());

-- helpers: same meaning as before, now inside the caller's institution
create or replace function private.can_see_student(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.students s
     where s.id = sid
       and s.institution_id = private.my_institution()
       and (private.is_admin() or s.mentor_id = private.my_mentor_id() or s.id = private.my_student_id()));
$$;

drop policy if exists "students by role" on public.students;
create policy "students by role" on public.students for select to authenticated
  using (institution_id = private.my_institution()
         and (private.is_admin() or mentor_id = private.my_mentor_id() or id = private.my_student_id()));

drop policy if exists "mentors readable" on public.mentors;
create policy "mentors of own institution" on public.mentors for select to authenticated
  using (institution_id = private.my_institution());

drop policy if exists "own profile or admin" on public.profiles;
create policy "own profile or admin of institution" on public.profiles for select to authenticated
  using (id = auth.uid() or (private.is_admin() and institution_id = private.my_institution()));

drop policy if exists "segments staff" on public.segments;
drop policy if exists "insights staff" on public.insights;
drop policy if exists "artifacts staff" on public.analytics_artifacts;
drop policy if exists "quality staff" on public.data_quality_log;
drop policy if exists "llm cache staff" on public.llm_cache;
create policy "segments staff" on public.segments for select to authenticated
  using (private.is_staff() and institution_id = private.my_institution());
create policy "insights staff" on public.insights for select to authenticated
  using (private.is_staff() and institution_id = private.my_institution());
create policy "artifacts staff" on public.analytics_artifacts for select to authenticated
  using (private.is_staff() and institution_id = private.my_institution());
create policy "quality staff" on public.data_quality_log for select to authenticated
  using (private.is_staff() and institution_id = private.my_institution());
create policy "llm cache staff" on public.llm_cache for select to authenticated
  using (private.is_staff() and institution_id = private.my_institution());

drop policy if exists "uploads admin" on public.raw_uploads;
create policy "uploads admin" on public.raw_uploads for select to authenticated
  using (private.is_admin() and institution_id = private.my_institution());

drop policy if exists "audit read admin" on public.audit_log;
create policy "audit read admin" on public.audit_log for select to authenticated
  using (private.is_admin() and institution_id = private.my_institution());
-- audit rows written by the web app carry the writer's institution
alter table public.audit_log alter column institution_id
  set default coalesce(private.my_institution(), '00000000-0000-4000-8000-0000000000a1'::uuid);
drop policy if exists "audit insert own" on public.audit_log;
create policy "audit insert own" on public.audit_log for insert to authenticated
  with check (user_id = auth.uid() and institution_id = private.my_institution());

-- feedback that could not be matched to a student is visible to admins of that institution only
drop policy if exists "feedback by role" on public.feedback;
create policy "feedback by role" on public.feedback for select to authenticated
  using ((student_id is null and private.is_admin() and institution_id = private.my_institution())
         or private.can_see_student(student_id));

-- student-owned plan / connection rows: admins only within their institution
drop policy if exists "student plans read" on public.student_plans;
drop policy if exists "student plans insert" on public.student_plans;
drop policy if exists "student plans update" on public.student_plans;
drop policy if exists "student plans delete" on public.student_plans;
create policy "student plans read" on public.student_plans for select to authenticated
  using (private.can_see_student(student_id) and (private.is_admin() or student_id = private.my_student_id()));
create policy "student plans insert" on public.student_plans for insert to authenticated
  with check (private.can_see_student(student_id) and (private.is_admin() or student_id = private.my_student_id()));
create policy "student plans update" on public.student_plans for update to authenticated
  using (private.can_see_student(student_id) and (private.is_admin() or student_id = private.my_student_id()))
  with check (private.can_see_student(student_id) and (private.is_admin() or student_id = private.my_student_id()));
create policy "student plans delete" on public.student_plans for delete to authenticated
  using (private.can_see_student(student_id) and (private.is_admin() or student_id = private.my_student_id()));

drop policy if exists "external connections read" on public.external_connections;
drop policy if exists "external connections write" on public.external_connections;
create policy "external connections read" on public.external_connections for select to authenticated
  using (private.can_see_student(student_id) and (private.is_admin() or student_id = private.my_student_id()));
create policy "external connections write" on public.external_connections for all to authenticated
  using (private.can_see_student(student_id) and (private.is_admin() or student_id = private.my_student_id()))
  with check (private.can_see_student(student_id)
              and (private.is_admin() or (student_id = private.my_student_id() and provenance = 'manual_import')));
