-- Minimal synthetic fixture for supabase/tests/rls_isolation.sql in CI (local `supabase db start` only).
-- Never run against a real database: it creates two auth users.
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'ci-admin@example.invalid', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'ci-mentor@example.invalid', 'authenticated', 'authenticated');

insert into public.mentors (id, name, department) values
  ('M01', 'CI Mentor One', 'CSE'),
  ('M02', 'CI Mentor Two', 'ECE');

insert into public.students (id, name, branch, year, section, mentor_id) values
  ('CU25CSE0001', 'Synthetic Student A', 'CSE', 2, 'A', 'M01'),
  ('CU25CSE0002', 'Synthetic Student B', 'CSE', 2, 'A', 'M01'),
  ('CU25ECE0001', 'Synthetic Student C', 'ECE', 2, 'A', 'M02');

insert into public.profiles (id, full_name, role, mentor_id) values
  ('11111111-1111-1111-1111-111111111111', 'CI Admin', 'admin', null),
  ('22222222-2222-2222-2222-222222222222', 'CI Mentor', 'mentor', 'M01');
