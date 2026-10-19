-- Intervention integrity rules (migration 0011). Always rolled back; needs one student and one mentor profile.
begin;
create temp table t as
select (select id from public.students order by id limit 1) as sid,
       (select id from public.profiles where role = 'mentor' limit 1) as uid;
delete from public.interventions where student_id = (select sid from t) and type = 'counselling_referral';

insert into public.interventions (student_id, type, created_by) select sid, 'counselling_referral', uid from t;

do $$
declare iid uuid;
begin
  -- duplicate open intervention of the same type is refused
  begin
    insert into public.interventions (student_id, type) select sid, 'counselling_referral' from t;
    raise exception 'RULE: duplicate open intervention was accepted';
  exception when unique_violation then null;
  end;

  select id into iid from public.interventions where student_id = (select sid from t) and type = 'counselling_referral';

  -- allowed path: open -> in_progress -> done -> open (reopen) -> cancelled
  update public.interventions set status = 'in_progress' where id = iid;
  update public.interventions set status = 'done' where id = iid;
  -- once done, a new one of the same type may be opened
  insert into public.interventions (student_id, type) select sid, 'counselling_referral' from t;
  delete from public.interventions where student_id = (select sid from t) and type = 'counselling_referral' and status = 'open';
  update public.interventions set status = 'open' where id = iid;
  update public.interventions set status = 'cancelled' where id = iid;

  -- forbidden: cancelled -> done, cancelled -> in_progress
  begin
    update public.interventions set status = 'done' where id = iid;
    raise exception 'RULE: cancelled -> done was accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.interventions set status = 'in_progress' where id = iid;
    raise exception 'RULE: cancelled -> in_progress was accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;

do $$ begin raise notice 'Intervention rules: all checks passed'; end $$;
rollback;
