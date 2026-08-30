-- Luna self-modification candidate history.
-- Additive only. This schema stores isolated candidate artifacts and verification evidence.
-- It does not authorize production deployment and does not alter released/scientific/provider tables.

create table if not exists public.luna_self_modification_runs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  objective text not null check (char_length(objective) between 12 and 4000),
  reason text not null check (char_length(reason) between 1 and 4000),
  status text not null default 'PROPOSED' check (status in ('PROPOSED','GENERATING','TESTING','SAFETY_REJECTED','CANDIDATE_READY','DEPLOYMENT_BLOCKED','DEPLOYED','ROLLED_BACK','FAILED')),
  previous_version text,
  candidate_version text,
  rollback_available boolean not null default true,
  limits jsonb not null default '{}'::jsonb check (jsonb_typeof(limits) = 'object'),
  safety_result jsonb not null default '{}'::jsonb check (jsonb_typeof(safety_result) = 'object'),
  deployment_result jsonb not null default '{}'::jsonb check (jsonb_typeof(deployment_result) = 'object'),
  rollback_result jsonb not null default '{}'::jsonb check (jsonb_typeof(rollback_result) = 'object'),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_self_modification_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  run_id uuid not null references public.luna_self_modification_runs(id) on delete restrict,
  path text not null check (char_length(path) between 1 and 400),
  before_sha256 text check (before_sha256 is null or char_length(before_sha256) = 64),
  after_sha256 text check (after_sha256 is null or char_length(after_sha256) = 64),
  before_content text,
  after_content text,
  diff text,
  protected boolean not null default false,
  created_at timestamptz not null default now(),
  unique (run_id, path)
);

create table if not exists public.luna_self_modification_tests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  run_id uuid not null references public.luna_self_modification_runs(id) on delete restrict,
  test_name text not null check (char_length(test_name) between 1 and 240),
  status text not null check (status in ('PASSED','FAILED','SKIPPED','BLOCKED')),
  output text not null default '',
  duration_ms integer not null default 0 check (duration_ms >= 0 and duration_ms <= 900000),
  created_at timestamptz not null default now()
);

create index if not exists luna_self_modification_runs_workspace_idx on public.luna_self_modification_runs (workspace_id, created_at desc);
create index if not exists luna_self_modification_runs_status_idx on public.luna_self_modification_runs (workspace_id, status, updated_at desc);
create index if not exists luna_self_modification_files_run_idx on public.luna_self_modification_files (workspace_id, run_id, path);
create index if not exists luna_self_modification_tests_run_idx on public.luna_self_modification_tests (workspace_id, run_id, created_at desc);

alter table public.luna_self_modification_runs enable row level security;
alter table public.luna_self_modification_files enable row level security;
alter table public.luna_self_modification_tests enable row level security;

-- Candidate evidence is append-only. Updates to a run are handled by audited application logic;
-- immutable file snapshots and test results cannot be rewritten or deleted.
drop trigger if exists luna_self_modification_files_immutable on public.luna_self_modification_files;
create trigger luna_self_modification_files_immutable before update or delete on public.luna_self_modification_files for each row execute function public.luna_prevent_cognitive_audit_mutation();
drop trigger if exists luna_self_modification_tests_immutable on public.luna_self_modification_tests;
create trigger luna_self_modification_tests_immutable before update or delete on public.luna_self_modification_tests for each row execute function public.luna_prevent_cognitive_audit_mutation();
drop trigger if exists luna_self_modification_runs_touch on public.luna_self_modification_runs;
create trigger luna_self_modification_runs_touch before update on public.luna_self_modification_runs for each row execute function public.luna_cognitive_touch_updated_at();

select pg_notify('pgrst', 'reload schema');
