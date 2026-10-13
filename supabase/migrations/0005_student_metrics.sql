-- Raw indicator values (CGPA, attendance %, mocks...) so filters and Ask Ascora use real numbers, not percentiles.
alter table public.student_scores add column if not exists metrics jsonb;
