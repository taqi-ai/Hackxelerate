-- Mentor availability and placement panel (migration 0015). Runs in CI after rls_seed.sql and always rolls back.
-- Seed: admin 1111..., mentor 2222... (M01, students CU25CSE0001 and CU25CSE0002); M02 owns CU25ECE0001.
begin;

-- a second institution, to prove callers cannot write into it
insert into public.institutions (id, slug, name) values ('00000000-0000-4000-8000-0000000000b2', 'other-college', 'Other college');

-- 1. the double-booking guard -------------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$
declare first_id uuid;
begin
  insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time)
    values ('M01', 'CU25CSE0001', '2031-03-03', '10:00', '11:00') returning id into first_id;
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0002', '2031-03-03', '10:30', '11:30');
    raise exception 'FAIL 1a: overlapping booking accepted';
  exception when exclusion_violation then null; end;
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0002', '2031-03-03', '10:15', '10:45');
    raise exception 'FAIL 1b: booking inside another accepted';
  exception when exclusion_violation then null; end;
  insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0002', '2031-03-03', '11:00', '12:00');   -- back to back
  insert into public.mentor_allotments (mentor_id, batch_label, slot_date, start_time, end_time) values ('M02', 'Batch 2031', '2031-03-03', '10:00', '11:00');    -- another mentor, same time
  update public.mentor_allotments set status = 'cancelled' where id = first_id;
  insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0002', '2031-03-03', '10:00', '10:50');    -- a cancelled booking frees the time
end $$;

-- 2. basic validity ----------------------------------------------------------------------------------------
do $$ begin
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0001', '2031-03-04', '11:00', '10:00');
    raise exception 'FAIL 2a: end before start accepted';
  exception when check_violation then null; end;
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0001', '2031-03-04', '09:00', '14:00');
    raise exception 'FAIL 2b: slot over 4 hours accepted';
  exception when check_violation then null; end;
  begin
    insert into public.mentor_allotments (mentor_id, slot_date, start_time, end_time) values ('M01', '2031-03-04', '09:00', '10:00');
    raise exception 'FAIL 2c: booking with nobody named accepted';
  exception when check_violation then null; end;
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M99', 'CU25CSE0001', '2031-03-04', '09:00', '10:00');
    raise exception 'FAIL 2d: unknown mentor accepted';
  exception when foreign_key_violation then null; end;
end $$;

-- 3. holidays ----------------------------------------------------------------------------------------------
do $$ begin
  insert into public.mentor_holidays (mentor_id, from_date, to_date, reason) values ('M01', '2031-03-10', '2031-03-12', 'Conference');
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0001', '2031-03-11', '10:00', '11:00');
    raise exception 'FAIL 3a: booking on a holiday accepted';
  exception when exclusion_violation then null; end;
  insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0001', '2031-03-13', '10:00', '11:00');         -- day after: fine
  begin
    insert into public.mentor_holidays (mentor_id, from_date, to_date) values ('M01', '2031-03-12', '2031-03-14');
    raise exception 'FAIL 3b: overlapping holiday accepted';
  exception when exclusion_violation then null; end;
  begin
    insert into public.mentor_holidays (mentor_id, from_date, to_date) values ('M01', '2031-03-13', '2031-03-13');
    raise exception 'FAIL 3c: holiday over an existing booking accepted';
  exception when exclusion_violation then null; end;
  begin
    insert into public.mentor_holidays (mentor_id, from_date, to_date) values ('M02', '2031-04-05', '2031-04-01');
    raise exception 'FAIL 3d: holiday ending before it starts accepted';
  exception when check_violation then null; end;
  insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time, status) values ('M01', 'CU25CSE0001', '2031-03-11', '10:00', '11:00', 'cancelled');   -- a cancelled one may sit on a holiday
end $$;

-- 4. institution is stamped from the caller, never from the client ----------------------------------------------
do $$ begin
  insert into public.mentor_holidays (institution_id, mentor_id, from_date, to_date) values ('00000000-0000-4000-8000-0000000000b2', 'M02', '2031-05-01', '2031-05-02');
  if (select institution_id from public.mentor_holidays where mentor_id = 'M02' and from_date = '2031-05-01') <> '00000000-0000-4000-8000-0000000000a1' then
    raise exception 'FAIL 4: a client-chosen institution was accepted';
  end if;
end $$;

-- 5. a mentor: own time only -------------------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
do $$ begin
  insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25CSE0001', '2031-03-20', '10:00', '11:00');
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M02', 'CU25ECE0001', '2031-03-20', '10:00', '11:00');
    raise exception 'FAIL 5a: mentor booked another mentor''s time';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.mentor_allotments (mentor_id, student_id, slot_date, start_time, end_time) values ('M01', 'CU25ECE0001', '2031-03-21', '10:00', '11:00');
    raise exception 'FAIL 5b: mentor booked a student who is not theirs';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.mentor_allotments where mentor_id = 'M02') then raise exception 'FAIL 5c: mentor reads another mentor''s bookings'; end if;
  if not exists (select 1 from public.mentor_allotments where mentor_id = 'M01') then raise exception 'FAIL 5d: mentor cannot read own bookings'; end if;
  if not exists (select 1 from public.mentor_busy_slots('2031-03-01', '2031-03-31') where mentor_id = 'M02') then raise exception 'FAIL 5e: busy slots of other mentors not visible'; end if;
  if (select count(*) from public.mentor_holidays) < 1 then raise exception 'FAIL 5f: mentor cannot read holidays'; end if;
  begin
    insert into public.mentor_holidays (mentor_id, from_date, to_date) values ('M01', '2031-06-01', '2031-06-02');
    raise exception 'FAIL 5g: mentor recorded a holiday';
  exception when insufficient_privilege then null; end;
  delete from public.mentor_allotments where mentor_id = 'M01' and slot_date = '2031-03-20';
  if exists (select 1 from public.mentor_allotments where mentor_id = 'M01' and slot_date = '2031-03-20') is false then raise exception 'FAIL 5h: mentor deleted a booking (admins only may delete)'; end if;
end $$;

-- 6. placement panel ---------------------------------------------------------------------------------------------
do $$ begin
  begin
    insert into public.placement_drives (company, role, package_lpa, exam_at, venue_mode, allowed_branches) values ('Sneaky Co', 'Analyst', 5, '2031-06-01 10:00+05:30', 'Online', array['CSE']);
    raise exception 'FAIL 6a: mentor created a drive';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
do $$ declare d uuid; begin
  insert into public.placement_drives (company, role, package_lpa, exam_at, venue_mode, min_cgpa, max_active_backlogs, allowed_branches, min_coding_score)
    values ('Example Works', 'Analyst', 7.5, '2031-06-01 10:00+05:30', 'Online Assessment', 6.5, 1, array['CSE', 'ECE'], 40) returning id into d;
  begin
    insert into public.placement_drives (company, role, package_lpa, exam_at, venue_mode, allowed_branches) values ('Bad Co', 'Analyst', 500, '2031-06-01 10:00+05:30', 'Online', array['CSE']);
    raise exception 'FAIL 6b: package over 200 LPA accepted';
  exception when check_violation then null; end;
  begin
    insert into public.placement_drives (company, role, package_lpa, exam_at, venue_mode, allowed_branches) values ('Empty Co', 'Analyst', 5, '2031-06-01 10:00+05:30', 'Online', array[]::text[]);
    raise exception 'FAIL 6c: drive with no branches accepted';
  exception when check_violation then null; end;
  insert into public.placement_applications (drive_id, student_id) values (d, 'CU25ECE0001');
  begin
    insert into public.placement_applications (drive_id, student_id) values (d, 'CU25ECE0001');
    raise exception 'FAIL 6d: duplicate application accepted';
  exception when unique_violation then null; end;
  perform set_config('test.drive', d::text, true);
end $$;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
do $$ declare d uuid := current_setting('test.drive')::uuid; begin
  if (select count(*) from public.placement_drives) <> 1 then raise exception 'FAIL 6e: mentor cannot read drives'; end if;
  insert into public.placement_applications (drive_id, student_id) values (d, 'CU25CSE0001');
  begin
    insert into public.placement_applications (drive_id, student_id) values (d, 'CU25ECE0001');
    raise exception 'FAIL 6f: mentor applied for a student who is not theirs';
  exception when insufficient_privilege or unique_violation then null; end;
  if exists (select 1 from public.placement_applications where student_id = 'CU25ECE0001') then raise exception 'FAIL 6g: mentor reads another mentor''s application'; end if;
end $$;

-- 7. anonymous callers get nothing -----------------------------------------------------------------------------
reset role;
set local role anon;
do $$ begin
  begin perform 1 from public.mentor_allotments; raise exception 'FAIL 7a: anon read allotments'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.mentor_holidays; raise exception 'FAIL 7b: anon read holidays'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.placement_drives; raise exception 'FAIL 7c: anon read drives'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.placement_applications; raise exception 'FAIL 7d: anon read applications'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.mentor_busy_slots('2031-01-01', '2031-12-31'); raise exception 'FAIL 7e: anon called mentor_busy_slots'; exception when insufficient_privilege then null; end;
end $$;

rollback;
select 'mentor_placement.sql: all checks passed' as result;
