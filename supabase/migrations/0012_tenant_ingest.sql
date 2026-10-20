-- Migration 0012: institution-aware publishing (tenancy, contract step 1) and a safe reset.
--
-- 1. Bug fix (P0, data loss): ascora_reset used `truncate students, mentors ... cascade`. Since 0006/0007, profiles
--    (user accounts), student_plans, external_connections and student_score_history reference students or mentors,
--    so the next publish would have emptied every login, every student plan and all score history. The reset now
--    deletes only pipeline-owned rows of one institution and never touches user-owned tables. Students and mentors
--    are no longer deleted; ingest updates them in place (a student dropped from the source keeps their account and
--    history but gets no new scores).
-- 2. Every ingest token belongs to one institution (private.ingest_tokens). Ingest stamps that institution on every
--    row whatever the payload says, refuses rows for students of another institution, and refuses a key (roll number,
--    segment id, artefact key) that another institution already holds instead of silently skipping it. Roll numbers
--    are issued per institution in India; until the key swap (composite (institution_id, id) keys, a later migration)
--    a clash is reported, never merged.
-- 3. students.apaar_id: optional national 12-digit APAAR ID, unique when present, for cross-institution identity.
-- The existing token maps to the evaluation campus, so publishing behaves exactly as before for it.

-- tokens per institution (the single-row private.ingest_secret is kept, unused, for rollback)
create table if not exists private.ingest_tokens (
  token_sha256 text primary key,
  institution_id uuid not null references public.institutions(id),
  created_at timestamptz not null default now()
);
insert into private.ingest_tokens (token_sha256, institution_id)
select token_sha256, '00000000-0000-4000-8000-0000000000a1' from private.ingest_secret
on conflict do nothing;
revoke all on private.ingest_tokens from public, anon, authenticated;

-- pipeline-owned per-student tables carry the institution directly (scoped reset; groundwork for composite keys)
do $$
declare t text;
begin
  foreach t in array array['academic','attendance','lms_activity','engagement','placement','skills',
                           'student_scores','source_links','conflicts'] loop
    execute format('alter table public.%I add column if not exists institution_id uuid not null
                    default ''00000000-0000-4000-8000-0000000000a1'' references public.institutions(id)', t);
    execute format('create index if not exists %I on public.%I (institution_id)', 'idx_' || t || '_institution', t);
  end loop;
end $$;

alter table public.students add column if not exists apaar_id text check (apaar_id ~ '^[0-9]{12}$');
create unique index if not exists uniq_students_apaar on public.students (apaar_id) where apaar_id is not null;
create unique index if not exists uniq_students_institution_id on public.students (institution_id, id);

create or replace function private.ingest_institution(p_token text) returns uuid
language plpgsql stable security definer set search_path = public, extensions as $$
declare v uuid;
begin
  select institution_id into v from private.ingest_tokens
   where token_sha256 = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v is null then
    raise exception 'invalid ingest token' using errcode = '42501';
  end if;
  return v;
end $$;
revoke all on function private.ingest_institution(text) from public, anon, authenticated;

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

  -- a key held by another institution is a clash to report, not a duplicate to skip
  select a.attname into pk
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
   where i.indrelid = ('public.' || p_table)::regclass and i.indisprimary and i.indnatts = 1;
  if has_inst and pk is not null and (p_rows -> 0) ? pk then
    execute format('select exists (select 1 from public.%I t join jsonb_array_elements($1) r on t.%I::text = r ->> %L
                     where t.institution_id <> $2)', p_table, pk, pk)
      into clash using p_rows, v_inst;
    if clash then
      raise exception '% key already used by another institution (per-institution keys are not enabled yet)', p_table
        using errcode = '23505';
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
    case when p_table in ('students', 'mentors') and upd is not null then 'on conflict (id) do update set ' || upd
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
    delete from public.interventions i
     where exists (select 1 from public.students s where s.id = i.student_id and s.institution_id = v_inst);
  end if;
end $$;
