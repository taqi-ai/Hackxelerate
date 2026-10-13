-- Ascora schema: unified student view, analytics outputs, workflow, governance.
-- All data in this project is synthetic.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- identity
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin', 'mentor')),
  mentor_id text,
  created_at timestamptz not null default now()
);

create table public.mentors (
  id text primary key,
  name text not null,
  department text not null
);

-- ---------------------------------------------------------------- unified student view
create table public.students (
  id text primary key,                 -- canonical roll, e.g. 24CSE0042
  name text not null,
  email text,
  phone text,
  branch text not null,
  year smallint not null,
  section text not null,
  mentor_id text references public.mentors(id),
  -- contextual attributes: used ONLY for the fairness audit, never as model features
  gender text,
  hosteller boolean,
  first_generation boolean,
  lateral_entry boolean,
  schooling_medium text,
  created_at timestamptz not null default now()
);
create index on public.students (mentor_id);
create index on public.students (branch, year, section);

create table public.source_links (
  id bigint generated always as identity primary key,
  student_id text references public.students(id) on delete cascade,
  source text not null,
  raw_ref text not null,               -- file + sheet + row
  raw_key text,                        -- the identifier as it appeared in the source
  match_method text not null,          -- roll_exact | email_name | name_fuzzy | ...
  match_confidence numeric(4,3) not null,
  status text not null check (status in ('auto', 'review', 'rejected'))
);
create index on public.source_links (student_id);
create index on public.source_links (status);

create table public.academic (
  student_id text primary key references public.students(id) on delete cascade,
  cgpa numeric(4,2),
  backlogs smallint,
  sgpa jsonb,                          -- {"1": 7.8, "2": 7.1, ...}
  subjects jsonb,                      -- [{code, name, internal, end_sem, total, sem}]
  lineage jsonb
);

create table public.attendance (
  student_id text primary key references public.students(id) on delete cascade,
  overall_pct numeric(5,2),
  core_pct numeric(5,2),
  by_subject jsonb,
  by_month jsonb,
  lineage jsonb
);

create table public.lms_activity (
  student_id text primary key references public.students(id) on delete cascade,
  login_freq numeric(6,2),             -- logins / week
  completion_rate numeric(5,2),        -- % assignments submitted
  minutes_per_week numeric(7,2),
  trend_slope numeric(8,4),
  weekly jsonb,                        -- [{week, logins, due, submitted, minutes}]
  lineage jsonb
);

create table public.engagement (
  student_id text primary key references public.students(id) on delete cascade,
  hackathons smallint default 0,
  clubs smallint default 0,
  workshops smallint default 0,
  certifications smallint default 0,
  events jsonb,
  lineage jsonb
);

create table public.placement (
  student_id text primary key references public.students(id) on delete cascade,
  aptitude numeric(5,2),
  coding numeric(5,2),
  mocks_attended smallint,
  mock_rating numeric(4,2),
  intent text,
  visited_cell boolean,
  lineage jsonb
);

create table public.skills (
  student_id text primary key references public.students(id) on delete cascade,
  technical jsonb,
  soft jsonb,
  technical_avg numeric(5,2),
  soft_avg numeric(5,2),
  lineage jsonb
);

create table public.feedback (
  id bigint generated always as identity primary key,
  student_id text references public.students(id) on delete cascade,
  course text,
  rating smallint,
  comment text,
  language text,
  theme text,
  sentiment text,
  lineage jsonb
);
create index on public.feedback (student_id);

-- ---------------------------------------------------------------- pipeline + quality
create table public.raw_uploads (
  id bigint generated always as identity primary key,
  file_name text not null,
  source_type text,
  storage_path text,
  rows integer,
  uploaded_at timestamptz not null default now()
);

create table public.data_quality_log (
  id bigint generated always as identity primary key,
  run_id text not null,
  created_at timestamptz not null default now(),
  report jsonb not null                -- per-source stats, steps, match metrics
);

create table public.conflicts (
  id bigint generated always as identity primary key,
  student_id text references public.students(id) on delete cascade,
  attribute text not null,
  source_a text not null,
  value_a text,
  source_b text not null,
  value_b text,
  resolution text not null,
  resolved_value text
);
create index on public.conflicts (student_id);

-- ---------------------------------------------------------------- intelligence
create table public.segments (
  id smallint primary key,
  persona text not null,
  description text not null,
  action text not null,
  size integer not null,
  traits jsonb,
  centroid jsonb
);

create table public.student_scores (
  student_id text primary key references public.students(id) on delete cascade,
  success_score numeric(5,2) not null,
  components jsonb not null,           -- {academic, placement, attendance, lms, skills, engagement}
  academic_risk_prob numeric(5,4),
  academic_risk_level text check (academic_risk_level in ('Low', 'Medium', 'High')),
  placement_risk_prob numeric(5,4),
  placement_risk_level text check (placement_risk_level in ('Low', 'Medium', 'High', 'N/A')),
  intent text,
  segment_id smallint references public.segments(id),
  persona text,
  shap_academic jsonb,
  shap_placement jsonb,
  alerts jsonb,                        -- rule triggers + silent decliner
  trend jsonb,                         -- weekly composite for sparkline
  recourse jsonb,                      -- counterfactual action plan
  readiness jsonb,                     -- intent-aware readiness view
  priority numeric(6,3),
  updated_at timestamptz not null default now()
);
create index on public.student_scores (academic_risk_level);
create index on public.student_scores (placement_risk_level);
create index on public.student_scores (segment_id);

create table public.insights (
  id bigint generated always as identity primary key,
  kind text not null,
  title text not null,
  body text not null,
  metric jsonb,
  severity text not null default 'info',
  rank smallint not null default 0
);

-- model metrics, model cards, sensitivity, fairness, early-warning curve, cohort stats
create table public.analytics_artifacts (
  key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- workflow + governance
create table public.interventions (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,            -- no FK: survives pipeline re-runs
  type text not null check (type in ('mentor_meeting', 'peer_tutoring', 'mock_interview', 'counselling_referral', 'parent_call', 'skill_workshop')),
  driver text,
  owner_name text,
  due_date date,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done', 'cancelled')),
  notes text,
  baseline jsonb,                      -- score + risks at creation
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.interventions (student_id);
create index on public.interventions (status);

create table public.audit_log (
  id bigint generated always as identity primary key,
  user_id uuid default auth.uid(),
  action text not null,
  student_id text,
  at timestamptz not null default now()
);

create table public.llm_cache (
  key text primary key,
  model text,
  output text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS helpers
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.my_mentor_id() returns text
language sql stable security definer set search_path = public as $$
  select mentor_id from public.profiles where id = auth.uid();
$$;

create or replace function public.can_see_student(sid text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.students s where s.id = sid and s.mentor_id = public.my_mentor_id());
$$;

-- ---------------------------------------------------------------- RLS policies
alter table public.profiles enable row level security;
alter table public.mentors enable row level security;
alter table public.students enable row level security;
alter table public.source_links enable row level security;
alter table public.academic enable row level security;
alter table public.attendance enable row level security;
alter table public.lms_activity enable row level security;
alter table public.engagement enable row level security;
alter table public.placement enable row level security;
alter table public.skills enable row level security;
alter table public.feedback enable row level security;
alter table public.raw_uploads enable row level security;
alter table public.data_quality_log enable row level security;
alter table public.conflicts enable row level security;
alter table public.segments enable row level security;
alter table public.student_scores enable row level security;
alter table public.insights enable row level security;
alter table public.analytics_artifacts enable row level security;
alter table public.interventions enable row level security;
alter table public.audit_log enable row level security;
alter table public.llm_cache enable row level security;

create policy "own profile or admin" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy "mentors readable" on public.mentors for select to authenticated using (true);

create policy "students by role" on public.students for select to authenticated
  using (public.is_admin() or mentor_id = public.my_mentor_id());

create policy "links by role" on public.source_links for select to authenticated using (public.can_see_student(student_id));
create policy "academic by role" on public.academic for select to authenticated using (public.can_see_student(student_id));
create policy "attendance by role" on public.attendance for select to authenticated using (public.can_see_student(student_id));
create policy "lms by role" on public.lms_activity for select to authenticated using (public.can_see_student(student_id));
create policy "engagement by role" on public.engagement for select to authenticated using (public.can_see_student(student_id));
create policy "placement by role" on public.placement for select to authenticated using (public.can_see_student(student_id));
create policy "skills by role" on public.skills for select to authenticated using (public.can_see_student(student_id));
create policy "feedback by role" on public.feedback for select to authenticated
  using (student_id is null and public.is_admin() or public.can_see_student(student_id));
create policy "conflicts by role" on public.conflicts for select to authenticated using (public.can_see_student(student_id));
create policy "scores by role" on public.student_scores for select to authenticated using (public.can_see_student(student_id));

create policy "uploads admin" on public.raw_uploads for select to authenticated using (public.is_admin());
create policy "quality readable" on public.data_quality_log for select to authenticated using (true);
create policy "segments readable" on public.segments for select to authenticated using (true);
create policy "insights readable" on public.insights for select to authenticated using (true);
create policy "artifacts readable" on public.analytics_artifacts for select to authenticated using (true);
create policy "llm cache readable" on public.llm_cache for select to authenticated using (true);

create policy "interventions read" on public.interventions for select to authenticated using (public.can_see_student(student_id));
create policy "interventions insert" on public.interventions for insert to authenticated
  with check (public.can_see_student(student_id) and created_by = auth.uid());
create policy "interventions update" on public.interventions for update to authenticated
  using (public.can_see_student(student_id)) with check (public.can_see_student(student_id));

create policy "audit insert own" on public.audit_log for insert to authenticated with check (user_id = auth.uid());
create policy "audit read admin" on public.audit_log for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------- ingest (ML service -> DB)
-- The ML service authenticates with a shared ingest secret (only its SHA-256 is stored here).
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.ingest_secret (id boolean primary key default true check (id), token_sha256 text not null);

create or replace function public.ascora_ingest(p_token text, p_table text, p_rows jsonb)
returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  n integer;
  cols text;
  allowed text[] := array['mentors','students','source_links','academic','attendance','lms_activity',
    'engagement','placement','skills','feedback','raw_uploads','data_quality_log','conflicts',
    'segments','student_scores','insights','analytics_artifacts','llm_cache','interventions'];
begin
  if not exists (select 1 from private.ingest_secret
                 where token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'invalid ingest token' using errcode = '42501';
  end if;
  if not (p_table = any(allowed)) then
    raise exception 'table % not allowed', p_table;
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;
  -- only the columns present in the payload, so identity ids and defaults still apply
  select string_agg(quote_ident(c.column_name), ',') into cols
  from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = p_table
    and c.column_name in (select jsonb_object_keys(p_rows -> 0));
  execute format(
    'insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1)',
    p_table, cols, cols, p_table)
  using p_rows;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.ascora_reset(p_token text, p_keep_interventions boolean default true)
returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not exists (select 1 from private.ingest_secret
                 where token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex')) then
    raise exception 'invalid ingest token' using errcode = '42501';
  end if;
  truncate public.student_scores, public.segments, public.insights, public.analytics_artifacts,
    public.conflicts, public.data_quality_log, public.raw_uploads, public.feedback, public.skills,
    public.placement, public.engagement, public.lms_activity, public.attendance, public.academic,
    public.source_links, public.students, public.mentors cascade;
  if not p_keep_interventions then
    truncate public.interventions;
  end if;
end $$;

revoke all on function public.ascora_ingest(text, text, jsonb) from public;
revoke all on function public.ascora_reset(text, boolean) from public;
grant execute on function public.ascora_ingest(text, text, jsonb) to anon, authenticated;
grant execute on function public.ascora_reset(text, boolean) to anon, authenticated;
