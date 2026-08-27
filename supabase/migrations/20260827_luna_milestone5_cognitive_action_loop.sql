-- Luna Phase 2 Milestone 5: owner-scoped deterministic cognitive action loop.
-- Apply after the established Luna cognitive, claims, attention, and priority migrations.
-- This migration is additive. Browser clients remain denied by RLS; server access requires
-- the existing verified knowledge-owner session and server-only Supabase service role.

alter table public.luna_cognitive_state add column if not exists cognitive_actions_enabled boolean not null default false;

create table if not exists public.luna_autonomous_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  source_type text not null check (source_type in ('KNOWLEDGE_GAP', 'ATTENTION', 'MAINTENANCE')),
  source_id uuid not null,
  decision_key text not null check (char_length(decision_key) between 12 and 240),
  objective text not null check (char_length(objective) between 3 and 12000),
  status text not null check (status in ('RECOMMENDED', 'DISPATCHED', 'BLOCKED', 'SUPPRESSED', 'COMPLETED', 'FAILED', 'CANCELLED')),
  outcome text not null check (outcome in ('DISPATCHED', 'REQUIRES_OWNER_REVIEW', 'NO_ACTION', 'DUPLICATE_SUPPRESSED', 'RUNTIME_UNAVAILABLE', 'CANCELLED', 'FAILED')),
  priority_score numeric(6,5) not null check (priority_score >= 0 and priority_score <= 1),
  policy_version text not null check (char_length(policy_version) between 1 and 80),
  rationale text not null check (char_length(rationale) between 1 and 8000),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  budget jsonb not null check (jsonb_typeof(budget) = 'object'),
  mission_id uuid references public.luna_missions(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, decision_key)
);

alter table public.luna_cognitive_versions drop constraint if exists luna_cognitive_versions_subject_type_check;
alter table public.luna_cognitive_versions add constraint luna_cognitive_versions_subject_type_check check (subject_type in ('STATE', 'MEMORY', 'PROJECT', 'GOAL', 'TASK', 'MISSION', 'WORKER', 'ATTENTION', 'REFLECTION', 'DECISION', 'RESULT_VALIDATION'));

alter table public.luna_missions add column if not exists decision_id uuid;
alter table public.luna_missions add column if not exists mission_origin text not null default 'OWNER' check (mission_origin in ('OWNER', 'AUTONOMOUS'));
alter table public.luna_missions drop constraint if exists luna_missions_decision_id_fkey;
alter table public.luna_missions add constraint luna_missions_decision_id_fkey foreign key (decision_id) references public.luna_autonomous_decisions(id) on delete restrict;
create unique index if not exists luna_missions_decision_unique_idx on public.luna_missions (decision_id) where decision_id is not null;

create table if not exists public.luna_result_validations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  mission_id uuid not null references public.luna_missions(id) on delete restrict,
  worker_id uuid not null references public.luna_workers(id) on delete restrict,
  report_object_id uuid references public.luna_knowledge_objects(id) on delete restrict,
  status text not null check (status in ('ACCEPTED', 'REJECTED', 'NEEDS_REVIEW')),
  output_hash text not null check (char_length(output_hash) = 64),
  result_summary text not null check (char_length(result_summary) between 1 and 1200),
  checks jsonb not null check (jsonb_typeof(checks) = 'object'),
  detail text not null check (char_length(detail) between 1 and 4000),
  created_at timestamptz not null default now(),
  unique (workspace_id, worker_id, output_hash)
);

create index if not exists luna_autonomous_decisions_workspace_status_idx on public.luna_autonomous_decisions (workspace_id, status, priority_score desc, updated_at desc);
create index if not exists luna_autonomous_decisions_source_idx on public.luna_autonomous_decisions (workspace_id, source_type, source_id, created_at desc);
create index if not exists luna_result_validations_mission_idx on public.luna_result_validations (workspace_id, mission_id, created_at desc);
create index if not exists luna_result_validations_worker_idx on public.luna_result_validations (workspace_id, worker_id, created_at desc);

create or replace function public.luna_prevent_result_validation_mutation()
returns trigger language plpgsql as $$ begin raise exception 'Luna result validations are immutable'; end; $$;

drop trigger if exists luna_luna_autonomous_decisions_touch on public.luna_autonomous_decisions;
create trigger luna_luna_autonomous_decisions_touch before update on public.luna_autonomous_decisions
for each row execute function public.luna_cognitive_touch_updated_at();

drop trigger if exists luna_result_validations_immutable on public.luna_result_validations;
create trigger luna_result_validations_immutable before update or delete on public.luna_result_validations
for each row execute function public.luna_prevent_result_validation_mutation();

alter table public.luna_autonomous_decisions enable row level security;
alter table public.luna_result_validations enable row level security;

-- No anon/authenticated browser policies are created. Server-only service-role access remains
-- owner-gated by the established Knowledge Space session layer.
select pg_notify('pgrst', 'reload schema');
