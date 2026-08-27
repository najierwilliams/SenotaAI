-- SenotaAI / Luna cognitive architecture
-- Additive owner-scoped durable state. Apply only after 20260827_knowledge_space.sql.
-- Browser clients remain denied by RLS; the server uses the existing Supabase service-role key
-- after validating the dedicated knowledge-owner session.

create extension if not exists pgcrypto;

create table if not exists public.luna_cognitive_state (
  workspace_id uuid primary key references public.luna_knowledge_workspaces(id) on delete restrict,
  owner_scope text not null check (char_length(owner_scope) between 3 and 128),
  identity_summary text not null default 'Luna is a persistent software assistant with an evidence-preserving Knowledge Space.' check (char_length(identity_summary) between 4 and 4000),
  capabilities jsonb not null default '[]'::jsonb check (jsonb_typeof(capabilities) = 'array'),
  limitations jsonb not null default '["Does not fabricate scientific evidence, coordinates, provider records, or biological capability."]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  current_focus text,
  active_goal_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(active_goal_ids) = 'array'),
  uncertainty_summary text not null default 'Scientific authority is evidence-bound; unavailable evidence remains unavailable.' check (char_length(uncertainty_summary) between 4 and 4000),
  autonomy_enabled boolean not null default true,
  maintenance_enabled boolean not null default false,
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, owner_scope)
);

create table if not exists public.luna_memories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  owner_scope text not null check (char_length(owner_scope) between 3 and 128),
  memory_kind text not null check (memory_kind in ('WORKING', 'EPISODIC', 'SEMANTIC', 'PROCEDURAL', 'PROJECT', 'RESEARCH', 'SELF')),
  content text not null check (char_length(content) between 1 and 16000),
  importance integer not null default 3 check (importance between 1 and 5),
  truth_state text not null default 'INFERENCE' check (truth_state in ('FACT', 'EVIDENCE', 'INFERENCE', 'HYPOTHESIS', 'ASSUMPTION', 'UNKNOWN', 'PROPOSED', 'VALIDATED', 'PROVIDER_CONFIRMED', 'CONTRADICTED', 'UNMAPPED', 'NOT_ESTABLISHED', 'UNAVAILABLE', 'PROVIDER_UNAVAILABLE')),
  source_type text not null check (source_type in ('USER', 'PROVIDER', 'PUBLISHED', 'LUNA', 'SYSTEM')),
  source_object_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(source_object_ids) = 'array'),
  project_id uuid,
  mission_id uuid,
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  is_active boolean not null default true,
  is_archived boolean not null default false,
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_memory_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  source_memory_id uuid not null references public.luna_memories(id) on delete restrict,
  target_memory_id uuid not null references public.luna_memories(id) on delete restrict,
  link_type text not null check (link_type in ('SUPPORTS', 'CONTRADICTS', 'DERIVED_FROM', 'RELATED_TO', 'SUPERSEDES', 'CONSOLIDATES')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  truth_state text not null default 'INFERENCE' check (truth_state in ('FACT', 'EVIDENCE', 'INFERENCE', 'HYPOTHESIS', 'ASSUMPTION', 'UNKNOWN', 'PROPOSED', 'VALIDATED', 'PROVIDER_CONFIRMED', 'CONTRADICTED', 'UNMAPPED', 'NOT_ESTABLISHED', 'UNAVAILABLE', 'PROVIDER_UNAVAILABLE')),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  mission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_memory_id <> target_memory_id),
  unique (workspace_id, source_memory_id, target_memory_id, link_type)
);

create table if not exists public.luna_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  owner_scope text not null check (char_length(owner_scope) between 3 and 128),
  title text not null check (char_length(title) between 1 and 240),
  summary text not null default '' check (char_length(summary) <= 16000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'COMPLETED', 'BLOCKED', 'ARCHIVED')),
  priority integer not null default 3 check (priority between 1 and 5),
  focus_object_id uuid,
  created_by text not null check (created_by in ('USER', 'LUNA')),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (focus_object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict
);

create table if not exists public.luna_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  project_id uuid references public.luna_projects(id) on delete restrict,
  parent_goal_id uuid references public.luna_goals(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 240),
  rationale text not null default '' check (char_length(rationale) <= 16000),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'PAUSED', 'COMPLETED', 'BLOCKED', 'CANCELLED')),
  priority integer not null default 3 check (priority between 1 and 5),
  progress numeric(5,4) not null default 0 check (progress >= 0 and progress <= 1),
  truth_state text not null default 'PROPOSED' check (truth_state in ('FACT', 'EVIDENCE', 'INFERENCE', 'HYPOTHESIS', 'ASSUMPTION', 'UNKNOWN', 'PROPOSED', 'VALIDATED', 'PROVIDER_CONFIRMED', 'CONTRADICTED', 'UNMAPPED', 'NOT_ESTABLISHED', 'UNAVAILABLE', 'PROVIDER_UNAVAILABLE')),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  owner_scope text not null check (char_length(owner_scope) between 3 and 128),
  project_id uuid references public.luna_projects(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  objective text not null check (char_length(objective) between 1 and 12000),
  status text not null default 'QUEUED' check (status in ('QUEUED', 'PLANNING', 'RUNNING', 'PAUSED', 'WAITING_FOR_PROVIDER', 'WAITING_FOR_RUNTIME', 'RECOVERY_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELLED', 'LIMIT_REACHED')),
  autonomy_mode text not null check (autonomy_mode in ('ON_DEMAND', 'MAINTENANCE', 'SCHEDULED')),
  priority integer not null default 3 check (priority between 1 and 5),
  current_focus text,
  root_task_id uuid,
  max_workers integer not null default 4 check (max_workers between 1 and 12),
  max_steps integer not null default 24 check (max_steps between 1 and 100),
  max_retries integer not null default 2 check (max_retries between 0 and 5),
  max_duration_seconds integer not null default 900 check (max_duration_seconds between 10 and 3600),
  max_model_requests integer not null default 12 check (max_model_requests between 0 and 100),
  max_token_budget integer not null default 24000 check (max_token_budget between 0 and 1000000),
  model_requests_used integer not null default 0 check (model_requests_used >= 0),
  token_usage integer not null default 0 check (token_usage >= 0),
  pause_requested boolean not null default false,
  cancel_requested boolean not null default false,
  runtime_run_id text,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 200),
  resume_after timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  project_id uuid references public.luna_projects(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 240),
  details text not null default '' check (char_length(details) <= 16000),
  status text not null default 'PENDING' check (status in ('PENDING', 'ELIGIBLE', 'IN_PROGRESS', 'PAUSED', 'BLOCKED', 'COMPLETED', 'FAILED', 'CANCELLED', 'RECOVERY_REQUIRED')),
  priority integer not null default 3 check (priority between 1 and 5),
  worker_role text check (worker_role in ('SCOUT', 'RESEARCHER', 'VALIDATOR', 'ORGANIZER', 'LINKER', 'DATA_ANALYST', 'PROVENANCE_AGENT', 'LICENSE_AGENT', 'REVIEW_AGENT', 'MAINTENANCE_AGENT', 'MEMORY_AGENT', 'PLANNER_AGENT', 'REFLECTION_AGENT', 'SYNTHESIS_AGENT')),
  related_object_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(related_object_ids) = 'array'),
  retries_used integer not null default 0 check (retries_used >= 0),
  max_retries integer not null default 2 check (max_retries between 0 and 5),
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_task_dependencies (
  task_id uuid not null references public.luna_tasks(id) on delete restrict,
  depends_on_task_id uuid not null references public.luna_tasks(id) on delete restrict,
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  check (task_id <> depends_on_task_id)
);

alter table public.luna_missions drop constraint if exists luna_missions_root_task_id_fkey;
alter table public.luna_missions add constraint luna_missions_root_task_id_fkey foreign key (root_task_id) references public.luna_tasks(id) on delete restrict;

create table if not exists public.luna_workers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid not null references public.luna_missions(id) on delete restrict,
  task_id uuid references public.luna_tasks(id) on delete restrict,
  role text not null check (role in ('SCOUT', 'RESEARCHER', 'VALIDATOR', 'ORGANIZER', 'LINKER', 'DATA_ANALYST', 'PROVENANCE_AGENT', 'LICENSE_AGENT', 'REVIEW_AGENT', 'MAINTENANCE_AGENT', 'MEMORY_AGENT', 'PLANNER_AGENT', 'REFLECTION_AGENT', 'SYNTHESIS_AGENT')),
  state text not null default 'QUEUED' check (state in ('IDLE', 'QUEUED', 'RUNNING', 'WAITING', 'PAUSED', 'FAILED', 'COMPLETED', 'CANCELLED')),
  attempt integer not null default 1 check (attempt >= 1),
  input_summary text not null default '' check (char_length(input_summary) <= 12000),
  output_summary text,
  handoff_to_role text check (handoff_to_role in ('SCOUT', 'RESEARCHER', 'VALIDATOR', 'ORGANIZER', 'LINKER', 'DATA_ANALYST', 'PROVENANCE_AGENT', 'LICENSE_AGENT', 'REVIEW_AGENT', 'MAINTENANCE_AGENT', 'MEMORY_AGENT', 'PLANNER_AGENT', 'REFLECTION_AGENT', 'SYNTHESIS_AGENT')),
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_tool_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid not null references public.luna_missions(id) on delete restrict,
  worker_id uuid references public.luna_workers(id) on delete restrict,
  tool_name text not null check (char_length(tool_name) between 1 and 120),
  tool_class text not null check (tool_class in ('KNOWLEDGE', 'PROVIDER', 'DOCUMENT', 'RESEARCH', 'SYSTEM')),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED')),
  request_summary text not null default '' check (char_length(request_summary) <= 12000),
  result_summary text,
  provider text,
  rate_limit_key text,
  started_at timestamptz,
  finished_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.luna_attention_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  project_id uuid references public.luna_projects(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  severity text not null check (severity in ('INFO', 'WARNING', 'ACTION_REQUIRED')),
  category text not null check (category in ('CONTRADICTION', 'PROVIDER', 'LICENSE', 'MISSION', 'KNOWLEDGE_GAP', 'SECURITY', 'SYSTEM')),
  title text not null check (char_length(title) between 1 and 240),
  detail text not null default '' check (char_length(detail) <= 12000),
  state text not null default 'OPEN' check (state in ('OPEN', 'ACKNOWLEDGED', 'RESOLVED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.luna_reflections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  project_id uuid references public.luna_projects(id) on delete restrict,
  summary text not null check (char_length(summary) between 1 and 16000),
  new_evidence_count integer not null default 0 check (new_evidence_count >= 0),
  new_inference_count integer not null default 0 check (new_inference_count >= 0),
  new_memory_count integer not null default 0 check (new_memory_count >= 0),
  relationship_count integer not null default 0 check (relationship_count >= 0),
  contradiction_count integer not null default 0 check (contradiction_count >= 0),
  unresolved_count integer not null default 0 check (unresolved_count >= 0),
  confidence text not null default 'UNKNOWN' check (confidence in ('LOW', 'MODERATE', 'HIGH', 'UNKNOWN')),
  next_action text,
  truth_state text not null default 'INFERENCE' check (truth_state in ('FACT', 'EVIDENCE', 'INFERENCE', 'HYPOTHESIS', 'ASSUMPTION', 'UNKNOWN', 'PROPOSED', 'VALIDATED', 'PROVIDER_CONFIRMED', 'CONTRADICTED', 'UNMAPPED', 'NOT_ESTABLISHED', 'UNAVAILABLE', 'PROVIDER_UNAVAILABLE')),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_recovery_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid not null references public.luna_missions(id) on delete restrict,
  worker_id uuid references public.luna_workers(id) on delete restrict,
  reason text not null check (char_length(reason) between 1 and 4000),
  status text not null default 'REQUIRED' check (status in ('REQUIRED', 'RESUMED', 'ABANDONED', 'RESOLVED')),
  resume_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(resume_payload) = 'object'),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.luna_cognitive_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  subject_type text not null check (subject_type in ('STATE', 'MEMORY', 'PROJECT', 'GOAL', 'TASK', 'MISSION', 'WORKER', 'ATTENTION', 'REFLECTION')),
  subject_id uuid,
  version integer not null check (version >= 1),
  action text not null check (char_length(action) between 1 and 100),
  changed_by text not null check (char_length(changed_by) between 1 and 128),
  reason text not null default '' check (char_length(reason) <= 4000),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  mission_id uuid references public.luna_missions(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (workspace_id, subject_type, subject_id, version)
);

create table if not exists public.luna_cognitive_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  worker_id uuid references public.luna_workers(id) on delete restrict,
  actor_scope text not null check (char_length(actor_scope) between 1 and 128),
  action text not null check (char_length(action) between 1 and 120),
  subject_type text not null check (char_length(subject_type) between 1 and 120),
  subject_id uuid,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  name text not null check (char_length(name) between 1 and 160),
  schedule_kind text not null check (schedule_kind in ('DAILY_MAINTENANCE', 'WEEKLY_REVIEW', 'PROVIDER_CHECK', 'RECOVERY_SWEEP')),
  enabled boolean not null default false,
  requested_cron text,
  runtime_provider text,
  last_run_at timestamptz,
  next_run_at timestamptz,
  last_status text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, schedule_kind)
);

create index if not exists luna_memories_retrieval_idx on public.luna_memories (workspace_id, is_active, importance desc, updated_at desc);
create index if not exists luna_memories_project_idx on public.luna_memories (workspace_id, project_id, memory_kind) where is_active = true;
create index if not exists luna_memory_links_source_idx on public.luna_memory_links (workspace_id, source_memory_id);
create index if not exists luna_projects_workspace_status_idx on public.luna_projects (workspace_id, status, priority desc, updated_at desc);
create index if not exists luna_goals_workspace_status_idx on public.luna_goals (workspace_id, status, priority desc, updated_at desc);
create index if not exists luna_missions_workspace_status_idx on public.luna_missions (workspace_id, status, priority desc, created_at);
create index if not exists luna_tasks_eligible_idx on public.luna_tasks (workspace_id, status, priority desc, created_at);
create index if not exists luna_tasks_mission_idx on public.luna_tasks (workspace_id, mission_id, status);
create index if not exists luna_workers_mission_state_idx on public.luna_workers (workspace_id, mission_id, state, created_at);
create index if not exists luna_tool_calls_mission_idx on public.luna_tool_calls (workspace_id, mission_id, created_at desc);
create index if not exists luna_attention_open_idx on public.luna_attention_items (workspace_id, state, severity, created_at desc) where state <> 'RESOLVED';
create index if not exists luna_recovery_open_idx on public.luna_recovery_records (workspace_id, status, created_at desc) where status = 'REQUIRED';
create index if not exists luna_cognitive_audit_idx on public.luna_cognitive_audit_events (workspace_id, created_at desc);

create or replace function public.luna_cognitive_touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.luna_prevent_cognitive_audit_mutation()
returns trigger language plpgsql as $$ begin raise exception 'Luna cognitive audit events are immutable'; end; $$;

-- Recreate idempotent update triggers.
do $$
declare tbl text;
begin
  foreach tbl in array array['luna_cognitive_state','luna_memories','luna_memory_links','luna_projects','luna_goals','luna_missions','luna_tasks','luna_workers','luna_maintenance_schedules'] loop
    execute format('drop trigger if exists %I on public.%I', 'luna_' || tbl || '_touch', tbl);
    execute format('create trigger %I before update on public.%I for each row execute function public.luna_cognitive_touch_updated_at()', 'luna_' || tbl || '_touch', tbl);
  end loop;
end $$;

drop trigger if exists luna_cognitive_audit_immutable on public.luna_cognitive_audit_events;
create trigger luna_cognitive_audit_immutable before update or delete on public.luna_cognitive_audit_events
for each row execute function public.luna_prevent_cognitive_audit_mutation();

alter table public.luna_cognitive_state enable row level security;
alter table public.luna_memories enable row level security;
alter table public.luna_memory_links enable row level security;
alter table public.luna_projects enable row level security;
alter table public.luna_goals enable row level security;
alter table public.luna_missions enable row level security;
alter table public.luna_tasks enable row level security;
alter table public.luna_task_dependencies enable row level security;
alter table public.luna_workers enable row level security;
alter table public.luna_tool_calls enable row level security;
alter table public.luna_attention_items enable row level security;
alter table public.luna_reflections enable row level security;
alter table public.luna_recovery_records enable row level security;
alter table public.luna_cognitive_versions enable row level security;
alter table public.luna_cognitive_audit_events enable row level security;
alter table public.luna_maintenance_schedules enable row level security;

-- No anon/authenticated policies are created. Every access passes through the verified owner session.
select pg_notify('pgrst', 'reload schema');
