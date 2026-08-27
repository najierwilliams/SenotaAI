-- SenotaAI / Luna Phase 2 Milestone 3
-- Additive owner-scoped knowledge-gap, curiosity, and explainable-priority records.
-- This migration does not alter released Knowledge Space, scientific/provider, mapping, coordinate, or Queue tables.

create table if not exists public.luna_knowledge_gaps (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  project_id uuid references public.luna_projects(id) on delete restrict,
  claim_id uuid references public.luna_claims(id) on delete restrict,
  related_object_id uuid references public.luna_knowledge_objects(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 240),
  question text not null check (char_length(question) between 1 and 4000),
  requested_evidence text not null default '' check (char_length(requested_evidence) <= 4000),
  rationale text not null default '' check (char_length(rationale) <= 8000),
  severity text not null check (severity in ('INFO', 'WARNING', 'ACTION_REQUIRED')),
  status text not null default 'OPEN' check (status in ('OPEN', 'WATCHING', 'RESOLVED', 'DISMISSED')),
  source_type text not null check (source_type in ('OWNER', 'LUNA', 'SYSTEM')),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_knowledge_gap_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  gap_id uuid not null references public.luna_knowledge_gaps(id) on delete restrict,
  revision_kind text not null check (revision_kind in ('CREATED', 'UPDATED', 'RESOLVED', 'DISMISSED')),
  reason text not null check (char_length(reason) between 1 and 4000),
  actor_scope text not null check (char_length(actor_scope) between 1 and 128),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_curiosity_candidates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  gap_id uuid not null references public.luna_knowledge_gaps(id) on delete restrict,
  proposed_action text not null check (char_length(proposed_action) between 1 and 4000),
  rationale text not null default '' check (char_length(rationale) <= 4000),
  estimated_cost text not null check (estimated_cost in ('LOW', 'MODERATE', 'HIGH')),
  status text not null default 'PROPOSED' check (status in ('PROPOSED', 'APPROVED', 'DISMISSED', 'COMPLETED')),
  created_by text not null check (created_by in ('OWNER', 'LUNA', 'SYSTEM')),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_priority_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  target_type text not null check (target_type in ('PROJECT', 'GOAL', 'TASK', 'GAP', 'CURIOSITY')),
  target_id uuid not null,
  urgency_score numeric(4,3) not null check (urgency_score >= 0 and urgency_score <= 1),
  impact_score numeric(4,3) not null check (impact_score >= 0 and impact_score <= 1),
  evidence_score numeric(4,3) not null check (evidence_score >= 0 and evidence_score <= 1),
  unblock_score numeric(4,3) not null check (unblock_score >= 0 and unblock_score <= 1),
  risk_score numeric(4,3) not null check (risk_score >= 0 and risk_score <= 1),
  priority_score numeric(4,3) not null check (priority_score >= 0 and priority_score <= 1),
  explanation text not null check (char_length(explanation) between 1 and 4000),
  assumptions jsonb not null default '[]'::jsonb check (jsonb_typeof(assumptions) = 'array'),
  actor_scope text not null check (char_length(actor_scope) between 1 and 128),
  created_at timestamptz not null default now()
);

create index if not exists luna_knowledge_gaps_open_idx on public.luna_knowledge_gaps (workspace_id, status, severity, updated_at desc) where status in ('OPEN', 'WATCHING');
create index if not exists luna_knowledge_gaps_claim_idx on public.luna_knowledge_gaps (workspace_id, claim_id, updated_at desc) where claim_id is not null;
create index if not exists luna_knowledge_gap_revisions_gap_idx on public.luna_knowledge_gap_revisions (workspace_id, gap_id, created_at desc);
create index if not exists luna_curiosity_candidates_gap_idx on public.luna_curiosity_candidates (workspace_id, gap_id, status, created_at desc);
create index if not exists luna_priority_assessments_target_idx on public.luna_priority_assessments (workspace_id, target_type, target_id, created_at desc);
create index if not exists luna_priority_assessments_rank_idx on public.luna_priority_assessments (workspace_id, priority_score desc, created_at desc);

-- Reuse the established timestamp and immutable-audit functions without changing them.
drop trigger if exists luna_luna_knowledge_gaps_touch on public.luna_knowledge_gaps;
create trigger luna_luna_knowledge_gaps_touch before update on public.luna_knowledge_gaps
for each row execute function public.luna_cognitive_touch_updated_at();

drop trigger if exists luna_knowledge_gap_revisions_immutable on public.luna_knowledge_gap_revisions;
create trigger luna_knowledge_gap_revisions_immutable before update or delete on public.luna_knowledge_gap_revisions
for each row execute function public.luna_prevent_cognitive_audit_mutation();

drop trigger if exists luna_priority_assessments_immutable on public.luna_priority_assessments;
create trigger luna_priority_assessments_immutable before update or delete on public.luna_priority_assessments
for each row execute function public.luna_prevent_cognitive_audit_mutation();

alter table public.luna_knowledge_gaps enable row level security;
alter table public.luna_knowledge_gap_revisions enable row level security;
alter table public.luna_curiosity_candidates enable row level security;
alter table public.luna_priority_assessments enable row level security;

-- No anon/authenticated policies are created. Access remains server-mediated after owner verification.
select pg_notify('pgrst', 'reload schema');
