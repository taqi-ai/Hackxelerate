-- Migration 0015: mentor availability with a double-booking guard, and the placement panel (expand-only, additive).
-- (The Round 2 brief called this 0007; migrations are already at 0014, so it is 0015.)
--  * mentor_allotments: a mentor cannot hold two bookings that overlap on the same day (exclusion constraint, half-open
--    times so back-to-back slots are fine), and cannot be booked on a holiday (trigger).
--  * mentor_holidays: no overlapping holidays per mentor, and a holiday cannot cover an existing booking.
--  * placement_drives / placement_applications: drive schedule, eligibility criteria and who applied.
-- Every row carries its institution (stamped from the caller) and is read and written only inside it.
-- Nothing existing is altered except two nullable/defaulted columns on mentors.

create extension if not exists btree_gist;

alter table public.mentors add column if not exists email text;
alter table public.mentors add column if not exists max_weekly_hours int not null default 12 check (max_weekly_hours between 1 and 60);

-- 1. bookings and holidays -------------------------------------------------------------------------------------------
create table public.mentor_allotments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  mentor_id text not null,
  student_id text,
  batch_label text check (batch_label is null or char_length(batch_label) between 2 and 60),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  purpose text not null default 'Mentor meeting' check (char_length(purpose) <= 120),
  status text not null default 'booked' check (status in ('booked', 'cancelled', 'done')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint allotment_times check (end_time > start_time and end_time - start_time <= interval '4 hours'),
  constraint allotment_names_someone check (student_id is not null or batch_label is not null),
  constraint allotment_mentor_fk foreign key (institution_id, mentor_id) references public.mentors (institution_id, id),
  constraint allotment_student_fk foreign key (institution_id, student_id) references public.students (institution_id, id),
  constraint no_double_booking exclude using gist (
    institution_id with =, mentor_id with =,
    tsrange(slot_date + start_time, slot_date + end_time, '[)') with &&) where (status <> 'cancelled')
);
create index idx_allotments_mentor_date on public.mentor_allotments (institution_id, mentor_id, slot_date);

create table public.mentor_holidays (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  mentor_id text not null,
  from_date date not null,
  to_date date not null,
  reason text not null default 'Leave' check (char_length(reason) <= 120),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint holiday_dates check (to_date >= from_date and to_date - from_date <= 60),
  constraint holiday_mentor_fk foreign key (institution_id, mentor_id) references public.mentors (institution_id, id),
  constraint no_overlapping_holidays exclude using gist (
    institution_id with =, mentor_id with =, daterange(from_date, to_date, '[]') with &&)
);

-- a signed-in caller can only ever write inside their own institution, whatever the client sends
create or replace function private.stamp_institution_forced() returns trigger
language plpgsql security definer set search_path = public as $$
declare v uuid := private.my_institution();
begin
  if v is not null then
    new.institution_id := v;
  elsif new.institution_id is null then
    raise exception 'cannot tell which institution this row belongs to' using errcode = '23502';
  end if;
  return new;
end $$;
revoke all on function private.stamp_institution_forced() from public, anon, authenticated;

-- the two rules a single exclusion constraint cannot express (errcode 23P01 = exclusion_violation, like the constraints) ----
create or replace function private.check_allotment_not_on_holiday() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'cancelled' and exists (
       select 1 from public.mentor_holidays h
        where h.institution_id = new.institution_id and h.mentor_id = new.mentor_id
          and new.slot_date between h.from_date and h.to_date) then
    raise exception 'Mentor is on holiday during the selected date' using errcode = '23P01';
  end if;
  return new;
end $$;
revoke all on function private.check_allotment_not_on_holiday() from public, anon, authenticated;

create or replace function private.check_holiday_has_no_bookings() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (
       select 1 from public.mentor_allotments a
        where a.institution_id = new.institution_id and a.mentor_id = new.mentor_id and a.status <> 'cancelled'
          and a.slot_date between new.from_date and new.to_date) then
    raise exception 'Mentor has bookings in this range; cancel or move them first' using errcode = '23P01';
  end if;
  return new;
end $$;
revoke all on function private.check_holiday_has_no_bookings() from public, anon, authenticated;

-- BEFORE triggers fire alphabetically: the institution must be stamped (a_) before the rule triggers (b_) compare it
create trigger a_stamp_institution before insert on public.mentor_allotments for each row execute function private.stamp_institution_forced();
create trigger a_stamp_institution before insert on public.mentor_holidays for each row execute function private.stamp_institution_forced();
create trigger b_allotment_not_on_holiday before insert or update of mentor_id, slot_date, status on public.mentor_allotments
  for each row execute function private.check_allotment_not_on_holiday();
create trigger b_holiday_has_no_bookings before insert or update of mentor_id, from_date, to_date on public.mentor_holidays
  for each row execute function private.check_holiday_has_no_bookings();

alter table public.mentor_allotments enable row level security;
alter table public.mentor_holidays enable row level security;

-- admins see and change every booking in their institution; a mentor sees and changes only their own
create policy "allotments read" on public.mentor_allotments for select to authenticated
  using (institution_id = private.my_institution() and (private.is_admin() or mentor_id = private.my_mentor_id()));
create policy "allotments insert" on public.mentor_allotments for insert to authenticated
  with check (institution_id = private.my_institution() and private.is_staff() and (private.is_admin() or (mentor_id = private.my_mentor_id() and (student_id is null or private.can_see_student(student_id)))));
create policy "allotments update" on public.mentor_allotments for update to authenticated
  using (institution_id = private.my_institution() and (private.is_admin() or mentor_id = private.my_mentor_id()))
  with check (institution_id = private.my_institution() and (private.is_admin() or (mentor_id = private.my_mentor_id() and (student_id is null or private.can_see_student(student_id)))));
create policy "allotments delete" on public.mentor_allotments for delete to authenticated
  using (institution_id = private.my_institution() and private.is_admin());

create policy "holidays read" on public.mentor_holidays for select to authenticated
  using (institution_id = private.my_institution() and private.is_staff());
create policy "holidays admin write" on public.mentor_holidays for all to authenticated
  using (institution_id = private.my_institution() and private.is_admin())
  with check (institution_id = private.my_institution() and private.is_admin());

-- other mentors' free and busy time, without who the booking is with
create or replace function public.mentor_busy_slots(p_from date, p_to date)
returns table (mentor_id text, slot_date date, start_time time, end_time time)
language sql stable security definer set search_path = public as $$
  select a.mentor_id, a.slot_date, a.start_time, a.end_time
    from public.mentor_allotments a
   where private.is_staff() and a.institution_id = private.my_institution() and a.status <> 'cancelled'
     and a.slot_date between p_from and least(p_to, p_from + 62);
$$;
revoke all on function public.mentor_busy_slots(date, date) from public, anon;
grant execute on function public.mentor_busy_slots(date, date) to authenticated;

-- 2. placement ------------------------------------------------------------------------------------------------------
create table public.placement_drives (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  company text not null check (char_length(company) between 2 and 80),
  role text not null check (char_length(role) between 2 and 80),
  package_lpa numeric(6, 2) not null check (package_lpa between 0 and 200),
  exam_at timestamptz not null,
  venue_mode text not null check (char_length(venue_mode) between 2 and 60),
  min_cgpa numeric(3, 1) not null default 0 check (min_cgpa between 0 and 10),
  max_active_backlogs int not null default 0 check (max_active_backlogs between 0 and 20),
  allowed_branches text[] not null check (cardinality(allowed_branches) between 1 and 5),
  min_coding_score numeric(5, 1) not null default 0 check (min_coding_score between 0 and 100),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table public.placement_applications (
  drive_id uuid not null references public.placement_drives(id) on delete cascade,
  institution_id uuid not null references public.institutions(id),
  student_id text not null,
  recorded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (drive_id, student_id),
  constraint application_student_fk foreign key (institution_id, student_id) references public.students (institution_id, id)
);
create trigger a_stamp_institution before insert on public.placement_drives for each row execute function private.stamp_institution_forced();
create trigger a_stamp_institution before insert on public.placement_applications for each row execute function private.stamp_institution_forced();

alter table public.placement_drives enable row level security;
alter table public.placement_applications enable row level security;
create policy "drives read" on public.placement_drives for select to authenticated using (institution_id = private.my_institution() and private.is_staff());
create policy "drives admin write" on public.placement_drives for all to authenticated
  using (institution_id = private.my_institution() and private.is_admin()) with check (institution_id = private.my_institution() and private.is_admin());
create policy "applications read" on public.placement_applications for select to authenticated
  using (institution_id = private.my_institution() and private.is_staff() and private.can_see_student(student_id));
create policy "applications insert" on public.placement_applications for insert to authenticated
  with check (institution_id = private.my_institution() and private.is_staff() and private.can_see_student(student_id));
create policy "applications admin delete" on public.placement_applications for delete to authenticated
  using (institution_id = private.my_institution() and private.is_admin());

-- no anonymous access to any of it
revoke all on public.mentor_allotments, public.mentor_holidays, public.placement_drives, public.placement_applications from anon;
