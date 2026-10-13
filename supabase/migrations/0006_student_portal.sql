-- Migration 0006: Student Portal, Scoped Access, and Personal Planning
-- Adds student role, personal targets, and external connection tracking.

-- 1. Extend role check on profiles
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('admin', 'mentor', 'student'));

-- 2. Add student_id to profiles for student accounts
alter table public.profiles add column if not exists student_id text references public.students(id) on delete set null;
create index if not exists idx_profiles_student_id on public.profiles(student_id);

-- 3. Student personal plans table (target scenarios, commitments, reminders)
create table if not exists public.student_plans (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students(id) on delete cascade,
  title text not null,
  category text not null check (category in ('attendance', 'marks', 'cgpa', 'deadline', 'general')),
  target_value jsonb not null,
  current_value jsonb not null,
  due_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_student_plans_student on public.student_plans(student_id);
create index if not exists idx_student_plans_status on public.student_plans(status);

-- 4. External connection metadata (CU Lucknow portal / manual import provenance)
create table if not exists public.external_connections (
  id uuid primary key default gen_random_uuid(),
  student_id text not null references public.students(id) on delete cascade,
  provider text not null default 'culko',
  status text not null check (status in ('connected', 'syncing', 'last_synced', 'expired', 'auth_required', 'failed', 'manual_import')),
  last_synced_at timestamptz,
  provenance text not null default 'synthetic_demo' check (provenance in ('synthetic_demo', 'culko_portal', 'manual_import', 'derived_calc')),
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_external_connections_student on public.external_connections(student_id);

-- 5. RLS helper for student identity
create or replace function private.my_student_id() returns text
language sql stable security definer set search_path = public as $$
  select student_id from public.profiles where id = auth.uid() and role = 'student';
$$;

revoke all on function private.my_student_id() from public, anon;
grant execute on function private.my_student_id() to authenticated;

-- 6. Update can_see_student to permit students viewing their own records
create or replace function private.can_see_student(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_admin()
      or exists (select 1 from public.students s where s.id = sid and s.mentor_id = private.my_mentor_id())
      or (sid = private.my_student_id());
$$;

-- 7. Update student table RLS policy
drop policy if exists "students by role" on public.students;
create policy "students by role" on public.students for select to authenticated
  using (private.is_admin() or mentor_id = private.my_mentor_id() or id = private.my_student_id());

-- 8. Enable RLS and add policies for student_plans
alter table public.student_plans enable row level security;

create policy "student plans read" on public.student_plans for select to authenticated
  using (private.is_admin() or student_id = private.my_student_id());

create policy "student plans insert" on public.student_plans for insert to authenticated
  with check (private.is_admin() or student_id = private.my_student_id());

create policy "student plans update" on public.student_plans for update to authenticated
  using (private.is_admin() or student_id = private.my_student_id())
  with check (private.is_admin() or student_id = private.my_student_id());

create policy "student plans delete" on public.student_plans for delete to authenticated
  using (private.is_admin() or student_id = private.my_student_id());

-- 9. Enable RLS and add policies for external_connections
alter table public.external_connections enable row level security;

create policy "external connections read" on public.external_connections for select to authenticated
  using (private.is_admin() or student_id = private.my_student_id());

create policy "external connections write" on public.external_connections for all to authenticated
  using (private.is_admin() or student_id = private.my_student_id())
  with check (private.is_admin() or student_id = private.my_student_id());
