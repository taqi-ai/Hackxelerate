-- Migration 0014: per-institution keys (tenancy, contract step 2).
--
-- Roll numbers, mentor ids, segment ids and artefact keys are issued per institution, so they are now unique only
-- within one: every such key becomes (institution_id, ...), and every foreign key to a student carries the
-- institution. Every row-level policy on per-student data also requires the row's institution to be the caller's,
-- because a roll number alone no longer identifies one student. Rows written by users (interventions, plans,
-- connections, score history, audit) get their institution from the caller (trigger), never from the client.
-- Existing data all belongs to the evaluation campus, so nothing visible changes.

-- 1. institution on user-written per-student tables, stamped server-side -------------------------------------------
create or replace function private.stamp_institution() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.institution_id is null then
    new.institution_id := private.my_institution();
  end if;
  if new.institution_id is null and new.student_id is not null then
    -- owner-run scripts (no signed-in user): only when the roll number names exactly one student
    select min(s.institution_id::text)::uuid into new.institution_id
      from public.students s where s.id = new.student_id
    having count(*) = 1;
  end if;
  if new.institution_id is null then
    raise exception 'cannot tell which institution this row belongs to' using errcode = '23502';
  end if;
  return new;
end $$;
revoke all on function private.stamp_institution() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['interventions','student_plans','external_connections','student_score_history'] loop
    execute format('alter table public.%I add column if not exists institution_id uuid references public.institutions(id)', t);
    execute format('update public.%I x set institution_id = s.institution_id from public.students s
                     where s.id = x.student_id and x.institution_id is null', t);
    execute format('alter table public.%I alter column institution_id set not null', t);
    execute format('create index if not exists %I on public.%I (institution_id)', 'idx_' || t || '_institution', t);
  end loop;
  -- audit rows come from users too: the caller's institution, not a default
  alter table public.audit_log alter column institution_id drop default;
  foreach t in array array['interventions','student_plans','external_connections','student_score_history','audit_log'] loop
    execute format('drop trigger if exists stamp_institution on public.%I', t);
    execute format('create trigger stamp_institution before insert on public.%I
                    for each row execute function private.stamp_institution()', t);
  end loop;
end $$;

-- 2. drop every foreign key that points at a single-column student, mentor or segment key ----------------------------
do $$
declare r record;
begin
  for r in select conrelid::regclass as tbl, conname from pg_constraint
            where contype = 'f' and confrelid in ('public.students'::regclass, 'public.mentors'::regclass, 'public.segments'::regclass)
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- 3. composite primary keys ----------------------------------------------------------------------------------------
drop index if exists public.uniq_students_institution_id;
alter table public.students drop constraint students_pkey, add primary key (institution_id, id);
alter table public.mentors drop constraint mentors_pkey, add primary key (institution_id, id);
alter table public.segments drop constraint segments_pkey, add primary key (institution_id, id);
alter table public.analytics_artifacts drop constraint analytics_artifacts_pkey, add primary key (institution_id, key);
alter table public.llm_cache drop constraint llm_cache_pkey, add primary key (institution_id, key);
do $$
declare t text;
begin
  foreach t in array array['academic','attendance','lms_activity','engagement','placement','skills','student_scores'] loop
    execute format('alter table public.%I drop constraint %I, add primary key (institution_id, student_id)', t, t || '_pkey');
  end loop;
end $$;

-- 4. composite foreign keys ----------------------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['academic','attendance','lms_activity','engagement','placement','skills','student_scores',
                           'source_links','conflicts','feedback','student_plans','external_connections','student_score_history'] loop
    execute format('alter table public.%I add constraint %I foreign key (institution_id, student_id)
                    references public.students (institution_id, id) on delete cascade', t, t || '_student_fkey');
  end loop;
end $$;
-- deleting a student unlinks the account but keeps it, and never clears the account's institution
alter table public.profiles add constraint profiles_student_fkey foreign key (institution_id, student_id)
  references public.students (institution_id, id) on delete set null (student_id);
alter table public.students add constraint students_mentor_fkey foreign key (institution_id, mentor_id)
  references public.mentors (institution_id, id);
alter table public.student_scores add constraint student_scores_segment_fkey foreign key (institution_id, segment_id)
  references public.segments (institution_id, id);

-- unique rules that were per roll number are now per institution and roll number
drop index if exists public.idx_external_connections_student;
create unique index idx_external_connections_student on public.external_connections (institution_id, student_id);
drop index if exists public.uniq_interventions_active_type;
create unique index uniq_interventions_active_type on public.interventions (institution_id, student_id, type)
  where status in ('open', 'in_progress');

-- 5. every policy on per-student data also requires the row's institution to be the caller's -------------------------
do $$
declare p record; q text; c text;
begin
  for p in select * from pg_policies
            where schemaname = 'public'
              and tablename in ('academic','attendance','lms_activity','engagement','placement','skills','student_scores',
                                'source_links','conflicts','feedback','student_plans','external_connections',
                                'student_score_history','interventions')
  loop
    q := case when p.qual is not null then format('(institution_id = private.my_institution()) and (%s)', p.qual) end;
    c := case when p.with_check is not null then format('(institution_id = private.my_institution()) and (%s)', p.with_check) end;
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
    execute format('create policy %I on public.%I as %s for %s to %s%s%s',
                   p.policyname, p.tablename, p.permissive, p.cmd, array_to_string(p.roles, ', '),
                   case when q is not null then ' using (' || q || ')' else '' end,
                   case when c is not null then ' with check (' || c || ')' else '' end);
  end loop;
end $$;

-- 6. functions that named a student by roll number alone ----------------------------------------------------------
create or replace function public.ascora_ingest(p_token text, p_table text, p_rows jsonb)
returns integer
language plpgsql security definer set search_path = public, extensions as $$
declare
  n integer;
  cols text;
  upd text;
  pk text;
  has_inst boolean;
  clash boolean;
  v_inst uuid := private.ingest_institution(p_token);
  allowed text[] := array['mentors','students','source_links','academic','attendance','lms_activity',
    'engagement','placement','skills','feedback','raw_uploads','data_quality_log','conflicts',
    'segments','student_scores','insights','analytics_artifacts','llm_cache','interventions'];
begin
  if not (p_table = any(allowed)) then
    raise exception 'table % not allowed', p_table;
  end if;
  if jsonb_array_length(p_rows) = 0 then
    return 0;
  end if;

  select exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = p_table and column_name = 'institution_id')
    into has_inst;

  -- rows about students must be about this institution's students
  if p_table <> 'students' and (p_rows -> 0) ? 'student_id' and exists (
       select 1 from jsonb_array_elements(p_rows) r
        where r ->> 'student_id' is not null
          and not exists (select 1 from public.students s where s.id = r ->> 'student_id' and s.institution_id = v_inst)) then
    raise exception 'rows for % refer to students outside this institution', p_table using errcode = '42501';
  end if;

  -- a single-column key (an identity id) held by another institution is still a clash, never a skip
  select a.attname into pk
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
   where i.indrelid = ('public.' || p_table)::regclass and i.indisprimary and i.indnatts = 1;
  if has_inst and pk is not null and (p_rows -> 0) ? pk then
    execute format('select exists (select 1 from public.%I t join jsonb_array_elements($1) r on t.%I::text = r ->> %L
                     where t.institution_id <> $2)', p_table, pk, pk)
      into clash using p_rows, v_inst;
    if clash then
      raise exception '% key already used by another institution', p_table using errcode = '23505';
    end if;
  end if;

  select string_agg(quote_ident(c.column_name), ','),
         string_agg(format('%1$I = excluded.%1$I', c.column_name), ',') filter (where c.column_name <> 'id')
    into cols, upd
    from information_schema.columns c
   where c.table_schema = 'public' and c.table_name = p_table and c.column_name <> 'institution_id'
     and c.column_name in (select jsonb_object_keys(p_rows -> 0));

  execute format(
    'insert into public.%I (%s%s) select %s%s from jsonb_populate_recordset(null::public.%I, $1) %s',
    p_table, cols, case when has_inst then ', institution_id' else '' end,
    cols, case when has_inst then ', $2' else '' end, p_table,
    -- students and mentors are kept across publishes (accounts point at them), so they are updated in place
    case when p_table in ('students', 'mentors') and upd is not null then 'on conflict (institution_id, id) do update set ' || upd
         else 'on conflict do nothing' end)
  using p_rows, v_inst;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.ascora_reset(p_token text, p_keep_interventions boolean default true)
returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_inst uuid := private.ingest_institution(p_token);
begin
  -- pipeline output of this institution only; accounts, plans, connections and score history are never touched
  delete from public.student_scores where institution_id = v_inst;
  delete from public.segments where institution_id = v_inst;
  delete from public.insights where institution_id = v_inst;
  delete from public.analytics_artifacts where institution_id = v_inst;
  delete from public.conflicts where institution_id = v_inst;
  delete from public.data_quality_log where institution_id = v_inst;
  delete from public.raw_uploads where institution_id = v_inst;
  delete from public.feedback where institution_id = v_inst;
  delete from public.skills where institution_id = v_inst;
  delete from public.placement where institution_id = v_inst;
  delete from public.engagement where institution_id = v_inst;
  delete from public.lms_activity where institution_id = v_inst;
  delete from public.attendance where institution_id = v_inst;
  delete from public.academic where institution_id = v_inst;
  delete from public.source_links where institution_id = v_inst;
  if not p_keep_interventions then
    delete from public.interventions where institution_id = v_inst;
  end if;
end $$;

create or replace function public.invite_account(p_email text, p_full_name text, p_role text,
                                                 p_mentor_id text default null, p_student_id text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_inst uuid := private.my_institution(); v_id uuid; v_email text := lower(trim(p_email));
begin
  if not private.can_provision() then
    raise exception 'only an admin can invite accounts' using errcode = '42501';
  end if;
  if p_role = 'mentor' and not exists (select 1 from public.mentors where id = p_mentor_id and institution_id = v_inst) then
    raise exception 'unknown mentor %', p_mentor_id using errcode = '22023';
  end if;
  if p_role = 'student' and not exists (select 1 from public.students where id = p_student_id and institution_id = v_inst) then
    raise exception 'unknown student %', p_student_id using errcode = '22023';
  end if;
  if p_role = 'student' and exists (select 1 from public.profiles where student_id = p_student_id and institution_id = v_inst) then
    raise exception 'student % already has an account', p_student_id using errcode = '23505';
  end if;
  if exists (select 1 from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = v_email) then
    raise exception 'an account with this email already exists' using errcode = '23505';
  end if;
  insert into public.account_invites (institution_id, email, full_name, role, mentor_id, student_id)
  values (v_inst, v_email, trim(p_full_name), p_role,
          case when p_role = 'mentor' then p_mentor_id end, case when p_role = 'student' then p_student_id end)
  returning id into v_id;
  insert into public.audit_log (action, student_id, detail, institution_id)
  values ('invite_account', case when p_role = 'student' then p_student_id end,
          jsonb_build_object('invite_id', v_id, 'role', p_role), v_inst);
  return v_id;
end $$;
