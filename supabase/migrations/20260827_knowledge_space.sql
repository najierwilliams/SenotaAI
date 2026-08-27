-- SenotaAI / Luna Knowledge Space
-- Owner-scoped, evidence-preserving persistence model.
-- Apply in the existing Supabase project's SQL Editor as a privileged migration.
-- Browser clients never receive the service-role key and access this schema only through server-side procedures.

create extension if not exists pgcrypto;

create table if not exists public.luna_knowledge_workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_scope text not null unique check (char_length(owner_scope) between 3 and 128),
  title text not null check (char_length(title) between 1 and 160),
  autonomy_level text not null default 'ON_DEMAND' check (autonomy_level in ('MANUAL', 'SUGGEST', 'ON_DEMAND', 'MAINTAIN_NON_DESTRUCTIVE')),
  autonomy_paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_knowledge_objects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  owner_scope text not null check (char_length(owner_scope) between 3 and 128),
  object_type text not null check (object_type in (
    'DOCUMENT', 'NOTE', 'SCIENTIFIC_STRUCTURE', 'SCIENTIFIC_REGION', 'DATASET', 'OBSERVATION',
    'CELLULAR_RECORD', 'MOLECULAR_RECORD', 'TISSUE_RECORD', 'CONNECTIVITY_RECORD', 'REFERENCE',
    'RESEARCH_QUESTION', 'HYPOTHESIS', 'TASK', 'NANOBOT_MISSION', 'NANOBOT_REPORT', 'ENTITY',
    'FOLDER', 'COLLECTION', 'EVIDENCE_RECORD', 'USER_DOCUMENT', 'EXTRACTED_EVIDENCE', 'APPROVAL'
  )),
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '' check (char_length(description) <= 12000),
  content text not null default '' check (char_length(content) <= 200000),
  source_type text not null default 'USER_NOTE' check (source_type in (
    'USER_FACT', 'USER_NOTE', 'USER_HYPOTHESIS', 'USER_QUESTION', 'USER_DECISION',
    'PROVIDER_DATA', 'PUBLISHED_EVIDENCE', 'AI_INFERENCE', 'VALIDATED_RELATIONSHIP'
  )),
  truth_state text not null default 'PROPOSED' check (truth_state in (
    'VERIFIED', 'PROVIDER_CONFIRMED', 'USER_APPROVED', 'PROBABILISTIC', 'INFERRED', 'PROPOSED',
    'REQUIRES_REVIEW', 'CONTRADICTED', 'UNMAPPED', 'NOT_ESTABLISHED', 'UNAVAILABLE'
  )),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'ARCHIVED', 'TRASHED', 'NEEDS_ATTENTION')),
  tags jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  scientific_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(scientific_metadata) = 'object'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  permission_metadata jsonb not null default '{"scope":"owner"}'::jsonb check (jsonb_typeof(permission_metadata) = 'object'),
  immutable_provider_snapshot boolean not null default false,
  current_version integer not null default 1 check (current_version >= 1),
  is_pinned boolean not null default false,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, workspace_id)
);

create index if not exists luna_knowledge_objects_workspace_updated_idx
  on public.luna_knowledge_objects (workspace_id, updated_at desc)
  where deleted_at is null;
create index if not exists luna_knowledge_objects_workspace_type_idx
  on public.luna_knowledge_objects (workspace_id, object_type)
  where deleted_at is null;
create index if not exists luna_knowledge_objects_workspace_state_idx
  on public.luna_knowledge_objects (workspace_id, truth_state, status)
  where deleted_at is null;

create table if not exists public.luna_knowledge_placements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  object_id uuid not null,
  parent_object_id uuid,
  placement_kind text not null default 'PRIMARY' check (placement_kind in ('PRIMARY', 'REFERENCE')),
  label text,
  sort_order integer not null default 0,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict,
  foreign key (parent_object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict,
  unique (workspace_id, object_id, parent_object_id, placement_kind)
);

create index if not exists luna_knowledge_placements_parent_idx
  on public.luna_knowledge_placements (workspace_id, parent_object_id, sort_order, created_at)
  where is_deleted = false;

create table if not exists public.luna_knowledge_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  source_object_id uuid not null,
  target_object_id uuid not null,
  relationship_type text not null check (relationship_type in (
    'IS_A', 'PART_OF', 'LOCATED_IN', 'RELATED_TO', 'SUPPORTED_BY', 'DERIVED_FROM', 'OBSERVED_IN',
    'CONNECTED_TO', 'REFERENCES', 'CONTRADICTS', 'SUPPORTS', 'REQUIRES_REVIEW', 'SAME_AS',
    'MAPPED_TO', 'UNMAPPED_TO', 'VISUALIZED_BY'
  )),
  source_type text not null default 'USER_NOTE' check (source_type in (
    'USER_FACT', 'USER_NOTE', 'USER_HYPOTHESIS', 'USER_QUESTION', 'USER_DECISION',
    'PROVIDER_DATA', 'PUBLISHED_EVIDENCE', 'AI_INFERENCE', 'VALIDATED_RELATIONSHIP'
  )),
  truth_state text not null default 'PROPOSED' check (truth_state in (
    'VERIFIED', 'PROVIDER_CONFIRMED', 'USER_APPROVED', 'PROBABILISTIC', 'INFERRED', 'PROPOSED',
    'REQUIRES_REVIEW', 'CONTRADICTED', 'UNMAPPED', 'NOT_ESTABLISHED', 'UNAVAILABLE'
  )),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_object_id <> target_object_id),
  foreign key (source_object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict,
  foreign key (target_object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict
);

create index if not exists luna_knowledge_relationships_source_idx
  on public.luna_knowledge_relationships (workspace_id, source_object_id, relationship_type)
  where is_deleted = false;
create index if not exists luna_knowledge_relationships_target_idx
  on public.luna_knowledge_relationships (workspace_id, target_object_id, relationship_type)
  where is_deleted = false;

create table if not exists public.luna_knowledge_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  object_id uuid not null,
  version integer not null check (version >= 1),
  action text not null check (action in ('CREATED', 'UPDATED', 'TRASHED', 'RESTORED', 'IMPORTED', 'MISSION_OUTPUT')),
  changed_by text not null check (char_length(changed_by) between 1 and 128),
  reason text not null default '',
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict,
  unique (object_id, version)
);

create index if not exists luna_knowledge_versions_object_idx
  on public.luna_knowledge_versions (workspace_id, object_id, version desc);

create table if not exists public.luna_knowledge_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  actor_scope text not null check (char_length(actor_scope) between 1 and 128),
  action text not null check (char_length(action) between 1 and 80),
  subject_type text not null check (char_length(subject_type) between 1 and 80),
  subject_id uuid,
  mission_id uuid,
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists luna_knowledge_audit_workspace_created_idx
  on public.luna_knowledge_audit_events (workspace_id, created_at desc);

create table if not exists public.luna_knowledge_missions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  target_object_id uuid,
  worker_role text not null check (worker_role in (
    'SCOUT', 'RESEARCHER', 'VALIDATOR', 'ORGANIZER', 'LINKER', 'DATA_ANALYST',
    'PROVENANCE_AGENT', 'LICENSE_AGENT', 'REVIEW_AGENT', 'MAINTENANCE_AGENT'
  )),
  objective text not null check (char_length(objective) between 1 and 12000),
  state text not null default 'QUEUED' check (state in (
    'QUEUED', 'SCOUTING', 'RESEARCHING', 'VALIDATING', 'ORGANIZING', 'REPORTING',
    'WAITING_FOR_USER', 'WAITING_FOR_PROVIDER', 'COMPLETED', 'FAILED', 'CANCELLED', 'MISSION_LIMIT_REACHED'
  )),
  autonomy_level text not null check (autonomy_level in ('MANUAL', 'SUGGEST', 'ON_DEMAND', 'MAINTAIN_NON_DESTRUCTIVE')),
  max_steps integer not null default 12 check (max_steps between 1 and 50),
  max_retries integer not null default 2 check (max_retries between 0 and 5),
  max_duration_seconds integer not null default 120 check (max_duration_seconds between 10 and 900),
  max_spawned_workers integer not null default 1 check (max_spawned_workers between 0 and 4),
  current_step integer not null default 0 check (current_step >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  stop_requested boolean not null default false,
  input_context jsonb not null default '{}'::jsonb check (jsonb_typeof(input_context) = 'object'),
  report_object_id uuid,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (target_object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict,
  foreign key (report_object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict
);

create index if not exists luna_knowledge_missions_workspace_state_idx
  on public.luna_knowledge_missions (workspace_id, state, created_at desc);

create table if not exists public.luna_knowledge_mission_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid not null references public.luna_knowledge_missions(id) on delete restrict,
  worker_role text not null,
  event_type text not null check (char_length(event_type) between 1 and 80),
  message text not null check (char_length(message) between 1 and 4000),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists luna_knowledge_mission_activity_mission_created_idx
  on public.luna_knowledge_mission_activity (workspace_id, mission_id, created_at);

create table if not exists public.luna_knowledge_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid references public.luna_knowledge_missions(id) on delete restrict,
  target_object_id uuid,
  action_type text not null check (char_length(action_type) between 1 and 100),
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'APPROVED', 'REJECTED', 'KEPT_FOR_REVIEW')),
  title text not null check (char_length(title) between 1 and 240),
  rationale text not null default '',
  source_summary text not null default '',
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  old_value jsonb,
  new_value jsonb,
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text,
  foreign key (target_object_id, workspace_id) references public.luna_knowledge_objects(id, workspace_id) on delete restrict
);

create index if not exists luna_knowledge_approvals_workspace_status_idx
  on public.luna_knowledge_approvals (workspace_id, status, requested_at desc);

create or replace function public.luna_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.luna_prevent_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Knowledge audit events are immutable';
end;
$$;

drop trigger if exists luna_workspaces_touch on public.luna_knowledge_workspaces;
create trigger luna_workspaces_touch before update on public.luna_knowledge_workspaces
for each row execute function public.luna_touch_updated_at();

drop trigger if exists luna_objects_touch on public.luna_knowledge_objects;
create trigger luna_objects_touch before update on public.luna_knowledge_objects
for each row execute function public.luna_touch_updated_at();

drop trigger if exists luna_placements_touch on public.luna_knowledge_placements;
create trigger luna_placements_touch before update on public.luna_knowledge_placements
for each row execute function public.luna_touch_updated_at();

drop trigger if exists luna_relationships_touch on public.luna_knowledge_relationships;
create trigger luna_relationships_touch before update on public.luna_knowledge_relationships
for each row execute function public.luna_touch_updated_at();

drop trigger if exists luna_missions_touch on public.luna_knowledge_missions;
create trigger luna_missions_touch before update on public.luna_knowledge_missions
for each row execute function public.luna_touch_updated_at();

drop trigger if exists luna_audit_events_immutable on public.luna_knowledge_audit_events;
create trigger luna_audit_events_immutable before update or delete on public.luna_knowledge_audit_events
for each row execute function public.luna_prevent_audit_mutation();

alter table public.luna_knowledge_workspaces enable row level security;
alter table public.luna_knowledge_objects enable row level security;
alter table public.luna_knowledge_placements enable row level security;
alter table public.luna_knowledge_relationships enable row level security;
alter table public.luna_knowledge_versions enable row level security;
alter table public.luna_knowledge_audit_events enable row level security;
alter table public.luna_knowledge_missions enable row level security;
alter table public.luna_knowledge_mission_activity enable row level security;
alter table public.luna_knowledge_approvals enable row level security;

-- No browser-facing policies are created. With RLS enabled, anon/authenticated clients cannot read or write these tables.
-- The existing server uses a service-role key and enforces the verified owner session before accessing this schema.
select pg_notify('pgrst', 'reload schema');
