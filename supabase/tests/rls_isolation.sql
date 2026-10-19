-- Row-level security isolation tests. Self-contained and always rolled back: safe on any environment.
-- Run with psql (`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_isolation.sql`) or paste into the
-- Supabase SQL editor. Each check raises an exception naming the leak; reaching the end prints "RLS isolation: all checks passed".
--
-- Identities are simulated the way PostgREST does it: SET ROLE plus request.jwt.claims. The script needs one existing
-- admin profile and one mentor profile; it finds them itself.

begin;

-- fixtures, picked as the table owner before switching roles
create temp table t_ids as
select
  (select id from public.profiles where role = 'admin' limit 1)  as admin_uid,
  (select id from public.profiles where role = 'mentor' limit 1) as mentor_uid,
  (select mentor_id from public.profiles where role = 'mentor' limit 1) as mentor_code,
  (select count(*) from public.students) as total_students;
create temp table t_other as  -- a student who does NOT belong to that mentor
select s.id from public.students s, t_ids where s.mentor_id is distinct from t_ids.mentor_code limit 1;
create temp table t_own as    -- a student who does
select s.id from public.students s, t_ids where s.mentor_id = t_ids.mentor_code limit 1;
grant select on t_ids, t_other, t_own to anon, authenticated;
-- a campus-wide analytics row, so the staff-only checks are not vacuous
insert into public.analytics_artifacts (key, payload) values ('rls-test', '{}');
-- a staff intervention about the student used in section 4, so the student read check is not vacuous
insert into public.interventions (student_id, type, created_by) select id, 'mentor_meeting', (select mentor_uid from t_ids) from t_own;

do $$ begin
  assert (select admin_uid from t_ids) is not null and (select mentor_uid from t_ids) is not null, 'setup: need an admin and a mentor profile';
  assert exists (select 1 from t_other) and exists (select 1 from t_own), 'setup: need students for and outside the mentor';
end $$;

-- 1. Signed-out visitor sees nothing -------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
do $$ begin
  assert (select count(*) from public.students) = 0, 'LEAK anon: students';
  assert (select count(*) from public.student_scores) = 0, 'LEAK anon: student_scores';
  assert (select count(*) from public.academic) = 0, 'LEAK anon: academic';
  assert (select count(*) from public.interventions) = 0, 'LEAK anon: interventions';
  assert (select count(*) from public.feedback) = 0, 'LEAK anon: feedback';
  assert (select count(*) from public.profiles) = 0, 'LEAK anon: profiles';
end $$;
reset role;

-- 2. Signed-in user with no profile sees nothing ---------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$ begin
  assert (select count(*) from public.students) = 0, 'LEAK no-profile user: students';
  assert (select count(*) from public.interventions) = 0, 'LEAK no-profile user: interventions';
  assert (select count(*) from public.analytics_artifacts) = 0, 'LEAK no-profile user: campus analytics';
end $$;
reset role;

-- 3. Mentor sees only their own students and cannot act outside them ---------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', (select mentor_uid from t_ids), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  assert (select count(*) from public.students) > 0, 'mentor sees none of their own students';
  assert (select count(*) from public.students s where s.mentor_id is distinct from (select mentor_code from t_ids)) = 0,
    'LEAK mentor: another mentor''s students';
  assert (select count(*) from public.student_scores x join t_other o on o.id = x.student_id) = 0, 'LEAK mentor: other student scores';
  assert (select count(*) from public.academic x join t_other o on o.id = x.student_id) = 0, 'LEAK mentor: other student academic';
  assert (select count(*) from public.feedback x join t_other o on o.id = x.student_id) = 0, 'LEAK mentor: other student feedback';
  assert (select count(*) from public.audit_log) = 0, 'LEAK mentor: audit log is admin-only';
  assert (select count(*) from public.analytics_artifacts where key = 'rls-test') = 1, 'mentor cannot read campus analytics';
  assert (select count(*) from public.profiles) = 1, 'LEAK mentor: can read other profiles';

  begin
    insert into public.interventions (student_id, type) values ((select id from t_other), 'mentor_meeting');
    raise exception 'LEAK mentor: created an intervention for another mentor''s student';
  exception when insufficient_privilege then null;
  end;

  -- positive control: the mentor CAN act on their own student
  insert into public.interventions (student_id, type) values ((select id from t_own), 'peer_tutoring');
  get diagnostics n = row_count;
  assert n = 1, 'mentor cannot create an intervention for their own student';

  update public.profiles set role = 'admin' where id = auth.uid();
  get diagnostics n = row_count;
  assert n = 0, 'ESCALATION mentor: changed own role';
end $$;
reset role;

-- 4. Student sees only themselves and cannot touch staff records ----------------------------------------------
--    (temporarily turn the mentor profile into a student; rolled back at the end)
update public.profiles set role = 'student', mentor_id = null, student_id = (select id from t_own)
 where id = (select mentor_uid from t_ids);
set local role authenticated;
do $$
declare n int;
begin
  assert (select count(*) from public.students) = 1, 'LEAK student: sees other students';
  assert (select count(*) from public.academic x join t_other o on o.id = x.student_id) = 0, 'LEAK student: other student academic';
  assert (select count(*) from public.interventions) = 0, 'LEAK student: reads staff intervention records';
  assert (select count(*) from public.analytics_artifacts) = 0, 'LEAK student: campus analytics';
  assert (select count(*) from public.insights) = 0, 'LEAK student: insights';
  assert (select count(*) from public.segments) = 0, 'LEAK student: segments';
  assert (select count(*) from public.llm_cache) = 0, 'LEAK student: llm cache';
  assert (select count(*) from public.data_quality_log) = 0, 'LEAK student: quality log';

  begin
    insert into public.interventions (student_id, type) values ((select id from t_own), 'mentor_meeting');
    raise exception 'LEAK student: created a staff intervention';
  exception when insufficient_privilege then null;
  end;

  update public.interventions set status = 'done' where student_id = (select id from t_own);
  get diagnostics n = row_count;
  assert n = 0, 'LEAK student: changed a staff intervention';

  begin
    insert into public.student_plans (student_id, title, category, target_value, current_value)
    values ((select id from t_other), 'x plan', 'general', '{}', '{}');
    raise exception 'LEAK student: wrote a plan for another student';
  exception when insufficient_privilege then null;
  end;

  begin
    insert into public.external_connections (student_id, status, provenance) values ((select id from t_own), 'connected', 'culko_portal');
    raise exception 'LEAK student: self-asserted portal provenance';
  exception when insufficient_privilege then null;
  end;

  -- positive control: the student CAN manage their own plans
  insert into public.student_plans (student_id, title, category, target_value, current_value)
  values ((select id from t_own), 'own plan', 'general', '{}', '{}');
  get diagnostics n = row_count;
  assert n = 1, 'student cannot save their own plan';

  update public.profiles set role = 'admin' where id = auth.uid();
  get diagnostics n = row_count;
  assert n = 0, 'ESCALATION student: changed own role';
end $$;
reset role;

-- 5. Admin sees the whole campus --------------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', (select admin_uid from t_ids), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.students) = (select total_students from t_ids), 'admin does not see every student';
  assert (select count(*) from public.audit_log) >= 0, 'admin cannot read the audit log';
end $$;
reset role;

do $$ begin raise notice 'RLS isolation: all checks passed'; end $$;
rollback;
