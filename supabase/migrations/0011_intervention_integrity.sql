-- Migration 0011: intervention integrity, enforced in the database so direct API calls obey it too.
-- 1. At most one open or in-progress intervention of a given type per student (double-clicks and two mentors acting
--    at once used to create duplicates).
-- 2. A documented state machine:
--      open        -> in_progress | done | cancelled
--      in_progress -> open | done | cancelled
--      done        -> open        (reopen)
--      cancelled   -> open        (reopen)

create unique index if not exists uniq_interventions_active_type
  on public.interventions (student_id, type) where status in ('open', 'in_progress');

create or replace function private.check_intervention_transition() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if (old.status = 'open' and new.status in ('in_progress', 'done', 'cancelled'))
     or (old.status = 'in_progress' and new.status in ('open', 'done', 'cancelled'))
     or (old.status in ('done', 'cancelled') and new.status = 'open') then
    return new;
  end if;
  raise exception 'Intervention status cannot change from % to %', old.status, new.status using errcode = '22023';
end $$;

drop trigger if exists interventions_status_transition on public.interventions;
create trigger interventions_status_transition before update of status on public.interventions
  for each row execute function private.check_intervention_transition();
