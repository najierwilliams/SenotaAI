-- Durable execution-controller fields on the existing self-modification run.
-- This extends the existing lifecycle record; it does not create a second controller table.
alter table public.luna_self_modification_runs
  drop constraint if exists luna_self_modification_runs_status_check;

alter table public.luna_self_modification_runs
  add constraint luna_self_modification_runs_status_check check (status in (
    'PROPOSED','ACCEPTED_FOR_EXECUTION','WORKER_PENDING','WORKER_RUNNING','WORKER_COMPLETED',
    'VALIDATION_FAILED','AWAITING_SAFETY','SAFETY_REJECTED','DEPLOYMENT_AUTHORIZED','DEPLOYING',
    'DEPLOYED','HEALTH_CHECK_FAILED','ROLLED_BACK','FAILED',
    'GENERATING','TESTING','CANDIDATE_READY','DEPLOYMENT_BLOCKED'
  ));

alter table public.luna_self_modification_runs
  add column if not exists initiated_by text,
  add column if not exists worker_job_id text,
  add column if not exists worker_workspace_ref text,
  add column if not exists worker_result jsonb not null default '{}'::jsonb,
  add column if not exists validation_result jsonb not null default '{}'::jsonb,
  add column if not exists safety_decision jsonb not null default '{}'::jsonb,
  add column if not exists health_check_result jsonb not null default '{}'::jsonb,
  add column if not exists accepted_at timestamptz,
  add column if not exists worker_pending_at timestamptz,
  add column if not exists worker_started_at timestamptz,
  add column if not exists worker_completed_at timestamptz,
  add column if not exists validation_at timestamptz,
  add column if not exists safety_at timestamptz,
  add column if not exists deployment_authorized_at timestamptz,
  add column if not exists deploying_at timestamptz,
  add column if not exists deployed_at timestamptz,
  add column if not exists health_checked_at timestamptz,
  add column if not exists rollback_completed_at timestamptz;

alter table public.luna_self_modification_runs
  add constraint luna_self_modification_runs_worker_result_object check (jsonb_typeof(worker_result) = 'object'),
  add constraint luna_self_modification_runs_validation_result_object check (jsonb_typeof(validation_result) = 'object'),
  add constraint luna_self_modification_runs_safety_decision_object check (jsonb_typeof(safety_decision) = 'object'),
  add constraint luna_self_modification_runs_health_check_result_object check (jsonb_typeof(health_check_result) = 'object');

create index if not exists luna_self_modification_runs_worker_job_idx on public.luna_self_modification_runs (workspace_id, worker_job_id);
select pg_notify('pgrst', 'reload schema');
