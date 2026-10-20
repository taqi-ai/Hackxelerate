-- Publishing and keys per institution (migrations 0012, 0014). Runs in CI after rls_seed.sql, as the database owner,
-- and always rolls back. Two ingest tokens: A = the evaluation campus (seeded students), B = a second institution that
-- reuses one of A's roll numbers, which is normal: roll numbers are issued by each institution.
begin;

insert into public.institutions (id, slug, name) values ('00000000-0000-4000-8000-0000000000b2', 'ci-second', 'CI second institution');
insert into private.ingest_tokens (token_sha256, institution_id) values
  (encode(extensions.digest('ci-token-a', 'sha256'), 'hex'), '00000000-0000-4000-8000-0000000000a1'),
  (encode(extensions.digest('ci-token-b', 'sha256'), 'hex'), '00000000-0000-4000-8000-0000000000b2');
insert into auth.users (id, email, aud, role) values
  ('55555555-5555-5555-5555-555555555555', 'ci-admin-b@example.invalid', 'authenticated', 'authenticated');

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

  -- 2. B may use a roll number A also uses: it is a different student; A's record is untouched
  perform public.ascora_ingest('ci-token-b', 'students', '[{"id":"CU25CSE0001","name":"Other Campus Student","branch":"CSE","year":1,"section":"A"}]');
  if (select count(*) from public.students where id = 'CU25CSE0001') <> 2 then raise exception 'FAIL 2: shared roll number not stored per institution'; end if;
  if (select name from public.students where id = 'CU25CSE0001' and institution_id = '00000000-0000-4000-8000-0000000000a1') <> 'Synthetic Student A' then
    raise exception 'FAIL 2b: B overwrote A''s student';
  end if;

  -- 3. B's own student is stamped with B, whatever the payload claims
  perform public.ascora_ingest('ci-token-b', 'students',
    '[{"id":"CUB25CSE0001","name":"Second Campus Student","branch":"CSE","year":1,"section":"A","institution_id":"00000000-0000-4000-8000-0000000000a1"}]');
  if (select institution_id from public.students where id = 'CUB25CSE0001') <> '00000000-0000-4000-8000-0000000000b2' then
    raise exception 'FAIL 3: payload institution_id was trusted';
  end if;

  -- 4. B cannot write rows about a student only A has
  begin
    perform public.ascora_ingest('ci-token-b', 'academic', '[{"student_id":"CU25ECE0001","cgpa":9.9}]');
    raise exception 'FAIL 4: rows for another institution''s student accepted';
  exception when insufficient_privilege then null;
  end;

  -- the same roll number gets separate records in each institution
  perform public.ascora_ingest('ci-token-a', 'academic', '[{"student_id":"CU25CSE0001","cgpa":7.1}]');
  perform public.ascora_ingest('ci-token-b', 'academic', '[{"student_id":"CU25CSE0001","cgpa":9.9}]');
  perform public.ascora_ingest('ci-token-b', 'academic', '[{"student_id":"CUB25CSE0001","cgpa":8.2}]');
  if (select count(*) from public.academic where student_id = 'CU25CSE0001') <> 2 then raise exception 'FAIL 4b: per-institution academic rows'; end if;
end $$;

-- 5. each institution's admin sees only its own copy of the shared roll number ------------------------------------
insert into public.profiles (id, full_name, role, institution_id)
values ('55555555-5555-5555-5555-555555555555', 'CI Admin B', 'admin', '00000000-0000-4000-8000-0000000000b2');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.students where id = 'CU25CSE0001') <> 1 then raise exception 'LEAK 5: A admin sees both students with the roll number'; end if;
  if (select cgpa from public.academic where student_id = 'CU25CSE0001') <> 7.1 then raise exception 'LEAK 5b: A admin sees B''s academic row'; end if;
  if exists (select 1 from public.students where id = 'CUB25CSE0001') then raise exception 'LEAK 5c: A admin sees B''s student'; end if;
  insert into public.interventions (student_id, type) values ('CU25CSE0001', 'mentor_meeting');
  if (select institution_id from public.interventions where student_id = 'CU25CSE0001' order by created_at desc limit 1)
     <> '00000000-0000-4000-8000-0000000000a1' then raise exception 'FAIL 5d: intervention not stamped with the caller''s institution'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.students) <> 2 then raise exception 'LEAK 5e: B admin sees other students'; end if;
  if (select cgpa from public.academic where student_id = 'CU25CSE0001') <> 9.9 then raise exception 'LEAK 5f: B admin sees A''s academic row'; end if;
  if exists (select 1 from public.interventions) then raise exception 'LEAK 5g: B admin sees A''s intervention'; end if;
  if exists (select 1 from public.student_plans) or exists (select 1 from public.student_score_history) then
    raise exception 'LEAK 5h: B admin sees A''s plans or history';
  end if;
  -- the same intervention type for B's student with the same roll number is allowed (rules are per institution)
  insert into public.interventions (student_id, type) values ('CU25CSE0001', 'mentor_meeting');
end $$;
reset role;

do $$
declare n int;
begin
  -- 6. B's reset clears only B's pipeline output
  perform public.ascora_reset('ci-token-b', true);
  if (select count(*) from public.academic where student_id = 'CU25CSE0001') <> 1 then raise exception 'FAIL 6: B reset touched A data or kept B data'; end if;
  if exists (select 1 from public.academic where institution_id = '00000000-0000-4000-8000-0000000000b2') then raise exception 'FAIL 6b: B reset kept B data'; end if;

  -- 7. A's reset keeps accounts, plans, score history and the students themselves
  select count(*) into n from public.profiles;
  perform public.ascora_reset('ci-token-a', true);
  if (select count(*) from public.profiles) <> n then raise exception 'FAIL 7: reset removed user accounts'; end if;
  if (select student_id from public.profiles where id = '22222222-2222-2222-2222-222222222222') is distinct from 'CU25CSE0001' then
    raise exception 'FAIL 7b: reset unlinked a student account';
  end if;
  if not exists (select 1 from public.student_plans where student_id = 'CU25CSE0001') then raise exception 'FAIL 7c: reset removed plans'; end if;
  if not exists (select 1 from public.student_score_history where student_id = 'CU25CSE0001') then raise exception 'FAIL 7d: reset removed score history'; end if;
  if exists (select 1 from public.academic) then raise exception 'FAIL 7e: reset kept pipeline output'; end if;
  if (select count(*) from public.students) <> 5 then raise exception 'FAIL 7f: reset changed the student list'; end if;

  -- 8. re-publishing a student updates it in place, in its own institution only
  perform public.ascora_ingest('ci-token-a', 'students', '[{"id":"CU25CSE0001","name":"Renamed Student","branch":"CSE","year":3,"section":"B"}]');
  if (select name || year from public.students where id = 'CU25CSE0001' and institution_id = '00000000-0000-4000-8000-0000000000a1') <> 'Renamed Student3' then
    raise exception 'FAIL 8: student not updated';
  end if;
  if (select name from public.students where id = 'CU25CSE0001' and institution_id = '00000000-0000-4000-8000-0000000000b2') <> 'Other Campus Student' then
    raise exception 'FAIL 8b: update reached the other institution';
  end if;

  -- 9. APAAR IDs: 12 digits, unique across the platform (the national identity)
  begin
    update public.students set apaar_id = '12345' where id = 'CU25ECE0001';
    raise exception 'FAIL 9: malformed APAAR ID accepted';
  exception when check_violation then null;
  end;
  update public.students set apaar_id = '123456789012' where id = 'CU25ECE0001';
  begin
    update public.students set apaar_id = '123456789012' where id = 'CUB25CSE0001';
    raise exception 'FAIL 9b: duplicate APAAR ID accepted';
  exception when unique_violation then null;
  end;

  raise notice 'ingest tenancy: all checks passed';
end $$;

rollback;
