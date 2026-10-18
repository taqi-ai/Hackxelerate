-- Migration 0007: Intervention Follow-ups, Historical Tracking, and Timeline Indexes
-- Adds structured follow-up evaluations and outcomes to interventions,
-- plus indexed historical score logging for student journey timelines.

-- 1. Extend interventions with follow-up measurements, review date, and outcome
alter table public.interventions
  add column if not exists followup jsonb,
  add column if not exists outcome text check (outcome in ('improved', 'stable', 'escalated', 'unresolved', 'inconclusive')),
  add column if not exists review_date date;

-- 2. Performance indexes for student journey timeline and intervention audits
create index if not exists idx_interventions_student_created on public.interventions(student_id, created_at);
create index if not exists idx_interventions_review_date on public.interventions(review_date);

-- 3. Historical score snapshots table for verified longitudinal tracking
create table if not exists public.student_score_history (
  id bigint generated always as identity primary key,
  student_id text not null references public.students(id) on delete cascade,
  success_score numeric(5,2) not null,
  academic_risk_prob numeric(5,4),
  academic_risk_level text check (academic_risk_level in ('Low', 'Medium', 'High')),
  placement_risk_prob numeric(5,4),
  placement_risk_level text check (placement_risk_level in ('Low', 'Medium', 'High', 'N/A')),
  components jsonb,
  model_version text not null default 'v1.0.0',
  recorded_at timestamptz not null default now(),
  provenance text not null default 'pipeline_snapshot'
);

create index if not exists idx_score_history_student_time on public.student_score_history(student_id, recorded_at);

-- 4. Enable RLS and scoped access for student_score_history
alter table public.student_score_history enable row level security;

create policy "score history by role" on public.student_score_history for select to authenticated
  using (private.can_see_student(student_id));
