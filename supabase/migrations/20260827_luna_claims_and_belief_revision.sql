-- SenotaAI / Luna Phase 2 Milestone 2
-- Additive owner-scoped claims, evidence anchors, and append-only belief revision.
-- Do not modify released Knowledge Space, scientific/provider, coordinate, or Queue tables.
-- Browser clients remain denied by RLS; server access follows verified knowledge-owner session checks.

create table if not exists public.luna_claims (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  owner_scope text not null check (char_length(owner_scope) between 3 and 128),
  project_id uuid references public.luna_projects(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  subject text not null check (char_length(subject) between 1 and 1000),
  predicate text not null check (char_length(predicate) between 1 and 1000),
  object_text text not null check (char_length(object_text) between 1 and 12000),
  statement text not null check (char_length(statement) between 1 and 16000),
  truth_state text not null default 'INFERENCE' check (truth_state in ('INFERENCE', 'HYPOTHESIS', 'ASSUMPTION', 'UNKNOWN', 'PROPOSED', 'CONTRADICTED', 'UNMAPPED', 'NOT_ESTABLISHED', 'UNAVAILABLE', 'PROVIDER_UNAVAILABLE')),
  confidence numeric(4,3) not null default 0.500 check (confidence >= 0 and confidence <= 1),
  lifecycle_state text not null default 'ACTIVE' check (lifecycle_state in ('ACTIVE', 'SUPERSEDED', 'RETRACTED', 'REQUIRES_REVIEW')),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  assumptions jsonb not null default '[]'::jsonb check (jsonb_typeof(assumptions) = 'array'),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_claim_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  claim_id uuid not null references public.luna_claims(id) on delete restrict,
  source_memory_id uuid references public.luna_memories(id) on delete restrict,
  source_object_id uuid references public.luna_knowledge_objects(id) on delete restrict,
  source_relationship_id uuid references public.luna_knowledge_relationships(id) on delete restrict,
  evidence_role text not null check (evidence_role in ('SUPPORTS', 'CONTRADICTS', 'CONTEXT', 'DERIVED_FROM')),
  source_excerpt text not null default '' check (char_length(source_excerpt) <= 4000),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  check (num_nonnulls(source_memory_id, source_object_id, source_relationship_id) = 1),
  unique (claim_id, source_memory_id, evidence_role),
  unique (claim_id, source_object_id, evidence_role),
  unique (claim_id, source_relationship_id, evidence_role)
);

create table if not exists public.luna_claim_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  claim_id uuid not null references public.luna_claims(id) on delete restrict,
  prior_claim_id uuid references public.luna_claims(id) on delete restrict,
  revision_kind text not null check (revision_kind in ('CREATED', 'REVISED', 'SUPERSEDED', 'RETRACTED', 'CONTRADICTION_RECORDED')),
  reason text not null check (char_length(reason) between 1 and 4000),
  actor_scope text not null check (char_length(actor_scope) between 1 and 128),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_at timestamptz not null default now(),
  check (prior_claim_id is null or prior_claim_id <> claim_id)
);

create index if not exists luna_claims_workspace_lifecycle_idx on public.luna_claims (workspace_id, lifecycle_state, confidence desc, updated_at desc);
create index if not exists luna_claims_workspace_truth_idx on public.luna_claims (workspace_id, truth_state, updated_at desc);
create index if not exists luna_claim_evidence_claim_idx on public.luna_claim_evidence (workspace_id, claim_id, evidence_role, created_at desc);
create index if not exists luna_claim_revisions_claim_idx on public.luna_claim_revisions (workspace_id, claim_id, created_at desc);

-- Reuse the established generic update timestamp function without changing it.
drop trigger if exists luna_luna_claims_touch on public.luna_claims;
create trigger luna_luna_claims_touch before update on public.luna_claims
for each row execute function public.luna_cognitive_touch_updated_at();

drop trigger if exists luna_claim_revisions_immutable on public.luna_claim_revisions;
create trigger luna_claim_revisions_immutable before update or delete on public.luna_claim_revisions
for each row execute function public.luna_prevent_cognitive_audit_mutation();

alter table public.luna_claims enable row level security;
alter table public.luna_claim_evidence enable row level security;
alter table public.luna_claim_revisions enable row level security;

-- No anon/authenticated policies are created. Every access remains server-mediated after owner verification.
select pg_notify('pgrst', 'reload schema');
