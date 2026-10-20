-- Publishing per institution (migration 0012). Runs in CI after rls_seed.sql, as the database owner, and always rolls
-- back. Two ingest tokens: A = the evaluation campus (seeded students), B = a second institution.
begin;

insert into public.institutions (id, slug, name) values ('00000000-0000-4000-8000-0000000000b2', 'ci-second', 'CI second institution');
insert into private.ingest_tokens (token_sha256, institution_id) values
  (encode(extensions.digest('ci-token-a', 'sha256'), 'hex'), '00000000-0000-4000-8000-0000000000a1'),
  (encode(extensions.digest('ci-token-b', 'sha256'), 'hex'), '00000000-0000-4000-8000-0000000000b2');

-- user-owned rows that a publish must never touch
update public.profiles set student_id = 'CU25CSE0001' where id = '22222222-2222-2222-2222-222222222222';
insert into public.student_plans (student_id, title, category, target_value, current_value)
values ('CU25CSE0001', 'Reach 75% attendance', 'attendance', '75', '68');
insert into public.student_score_history (student_id, success_score) values ('CU25CSE0001', 61.5);

do $$
declare n int;
begin
  -- 1. unknown token
  begin
    perform public.ascora_ingest('nope', 'students', '[{"id":"X"}]');
    raise exception 'FAIL 1: unknown token accepted';
  exception when insufficient_privilege then null;
  end;

  -- 2. B cannot take over a roll number A already holds
  begin
    perform public.ascora_ingest('ci-token-b', 'students', '[{"id":"CU25CSE0001","name":"Clash","branch":"CSE","year":1,"section":"A"}]');
    raise exception 'FAIL 2: cross-institution roll number accepted';
  exception when unique_violation then null;
  end;

  -- 3. B's own student is stamped with B, whatever the payload claims
  perform public.ascora_ingest('ci-token-b', 'students',
    '[{"id":"CUB25CSE0001","name":"Second Campus Student","branch":"CSE","year":1,"section":"A","institution_id":"00000000-0000-4000-8000-0000000000a1"}]');
  if (select institution_id from public.students where id = 'CUB25CSE0001') <> '00000000-0000-4000-8000-0000000000b2' then
    raise exception 'FAIL 3: payload institution_id was trusted';
  end if;

  -- 4. B cannot write rows about A's students
  begin
    perform public.ascora_ingest('ci-token-b', 'academic', '[{"student_id":"CU25CSE0001","cgpa":9.9}]');
    raise exception 'FAIL 4: rows for another institution''s student accepted';
  exception when insufficient_privilege then null;
  end;

  perform public.ascora_ingest('ci-token-a', 'academic', '[{"student_id":"CU25CSE0001","cgpa":7.1}]');
  perform public.ascora_ingest('ci-token-b', 'academic', '[{"student_id":"CUB25CSE0001","cgpa":8.2}]');
  if (select institution_id from public.academic where student_id = 'CUB25CSE0001') <> '00000000-0000-4000-8000-0000000000b2' then
    raise exception 'FAIL 4b: academic row not stamped with its institution';
  end if;

  -- 5. B's reset clears only B's pipeline output
  perform public.ascora_reset('ci-token-b', true);
  if not exists (select 1 from public.academic where student_id = 'CU25CSE0001') then raise exception 'FAIL 5: B reset removed A data'; end if;
  if exists (select 1 from public.academic where student_id = 'CUB25CSE0001') then raise exception 'FAIL 5b: B reset kept B data'; end if;

  -- 6. A's reset keeps accounts, plans, score history and the students themselves
  select count(*) into n from public.profiles;
  perform public.ascora_reset('ci-token-a', true);
  if (select count(*) from public.profiles) <> n then raise exception 'FAIL 6: reset removed user accounts'; end if;
  if (select student_id from public.profiles where id = '22222222-2222-2222-2222-222222222222') is distinct from 'CU25CSE0001' then
    raise exception 'FAIL 6b: reset unlinked a student account';
  end if;
  if not exists (select 1 from public.student_plans where student_id = 'CU25CSE0001') then raise exception 'FAIL 6c: reset removed plans'; end if;
  if not exists (select 1 from public.student_score_history where student_id = 'CU25CSE0001') then raise exception 'FAIL 6d: reset removed score history'; end if;
  if exists (select 1 from public.academic where student_id = 'CU25CSE0001') then raise exception 'FAIL 6e: reset kept pipeline output'; end if;
  if (select count(*) from public.students) <> 4 then raise exception 'FAIL 6f: reset changed the student list'; end if;

  -- 7. re-publishing a student updates it in place
  perform public.ascora_ingest('ci-token-a', 'students', '[{"id":"CU25CSE0001","name":"Renamed Student","branch":"CSE","year":3,"section":"B"}]');
  if (select name || year from public.students where id = 'CU25CSE0001') <> 'Renamed Student3' then raise exception 'FAIL 7: student not updated'; end if;

  -- 8. APAAR IDs: 12 digits, unique
  begin
    update public.students set apaar_id = '12345' where id = 'CU25CSE0001';
    raise exception 'FAIL 8: malformed APAAR ID accepted';
  exception when check_violation then null;
  end;
  update public.students set apaar_id = '123456789012' where id = 'CU25CSE0001';
  begin
    update public.students set apaar_id = '123456789012' where id = 'CUB25CSE0001';
    raise exception 'FAIL 8b: duplicate APAAR ID accepted';
  exception when unique_violation then null;
  end;

  raise notice 'ingest tenancy: all checks passed';
end $$;

rollback;
