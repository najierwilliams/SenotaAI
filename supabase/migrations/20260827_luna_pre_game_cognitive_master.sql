-- Luna pre-game cognitive master architecture.
-- Additive only. Browser clients remain denied by RLS; server-side services use the
-- existing service role only after verifying the Knowledge Space owner session.
-- This migration does not alter provider records, scientific mappings, or runtime dispatch.

create table if not exists public.luna_cognitive_inputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  source_key text not null check (char_length(source_key) between 8 and 240),
  input_type text not null check (input_type in ('CONVERSATION','USER_CORRECTION','OWNER_NOTE','WORKER_RESULT','PROJECT_OUTCOME','WORLD_EVENT','MAINTENANCE')),
  summary text not null check (char_length(summary) between 1 and 1200),
  relevance text not null check (relevance in ('RELEVANT','CONTEXT_ONLY','IGNORED','SENSITIVE_REJECTED')),
  privacy_class text not null default 'OWNER_PRIVATE' check (privacy_class in ('OWNER_PRIVATE','SYSTEM_DERIVED')),
  project_id uuid references public.luna_projects(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  worker_id uuid references public.luna_workers(id) on delete restrict,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  unique (workspace_id, source_key)
);

create table if not exists public.luna_experiences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  input_id uuid references public.luna_cognitive_inputs(id) on delete restrict,
  experience_kind text not null check (experience_kind in ('CONVERSATION','CORRECTION','OBSERVATION','WORKER_OUTCOME','PROJECT_OUTCOME','WORLD_EVENT','MAINTENANCE')),
  summary text not null check (char_length(summary) between 1 and 1600),
  importance numeric(4,3) not null check (importance >= 0 and importance <= 1),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  project_id uuid references public.luna_projects(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  worker_id uuid references public.luna_workers(id) on delete restrict,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now(),
  unique (workspace_id, input_id, experience_kind)
);

create table if not exists public.luna_cognitive_cycles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  cycle_key text not null check (char_length(cycle_key) between 8 and 240),
  cycle_type text not null check (cycle_type in ('MANUAL','CONVERSATION','WORKER_COMPLETION','WORLD_EVENT','MAINTENANCE')),
  input_id uuid references public.luna_cognitive_inputs(id) on delete restrict,
  status text not null check (status in ('COMPLETED','STOPPED','FAILED')),
  evaluated_count integer not null default 0 check (evaluated_count between 0 and 100),
  derived_count integer not null default 0 check (derived_count between 0 and 16),
  stop_reason text check (stop_reason is null or char_length(stop_reason) <= 1000),
  created_at timestamptz not null default now(),
  unique (workspace_id, cycle_key)
);

create table if not exists public.luna_attention_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  source_type text not null check (char_length(source_type) between 1 and 80),
  source_id uuid not null,
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid not null,
  severity text not null check (severity in ('INFO','WARNING','ACTION_REQUIRED')),
  score numeric(4,3) not null check (score >= 0 and score <= 1),
  factors jsonb not null default '{}'::jsonb check (jsonb_typeof(factors) = 'object'),
  state text not null default 'ACTIVE' check (state in ('ACTIVE','SUPPRESSED','RESOLVED','EXPIRED')),
  focus_tier text check (focus_tier is null or focus_tier in ('PRIMARY','SECONDARY','BACKGROUND')),
  suppression_reason text check (suppression_reason is null or char_length(suppression_reason) <= 1000),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, source_type, source_id, target_type, target_id)
);

create table if not exists public.luna_focus_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  attention_id uuid not null references public.luna_attention_assessments(id) on delete restrict,
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid not null,
  tier text not null check (tier in ('PRIMARY','SECONDARY','BACKGROUND')),
  rank integer not null check (rank between 1 and 12),
  score numeric(4,3) not null check (score >= 0 and score <= 1),
  cycle_id uuid references public.luna_cognitive_cycles(id) on delete restrict,
  replaced_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.luna_uncertainty_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid not null,
  score numeric(4,3) not null check (score >= 0 and score <= 1),
  importance numeric(4,3) not null check (importance >= 0 and importance <= 1),
  evidence_basis text not null check (char_length(evidence_basis) between 1 and 1600),
  status text not null default 'OPEN' check (status in ('OPEN','REDUCED','ACCEPTED','RESOLVED')),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, target_type, target_id)
);

create table if not exists public.luna_novelty_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid not null,
  novelty_key text not null check (char_length(novelty_key) between 8 and 240),
  score numeric(4,3) not null check (score >= 0 and score <= 1),
  rationale text not null check (char_length(rationale) between 1 and 1600),
  source_input_id uuid references public.luna_cognitive_inputs(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (workspace_id, novelty_key)
);

create table if not exists public.luna_contradictions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  anchor_a_type text not null check (char_length(anchor_a_type) between 1 and 80),
  anchor_a_id uuid not null,
  anchor_b_type text not null check (char_length(anchor_b_type) between 1 and 80),
  anchor_b_id uuid not null,
  summary text not null check (char_length(summary) between 1 and 1600),
  impact numeric(4,3) not null check (impact >= 0 and impact <= 1),
  status text not null default 'UNRESOLVED' check (status in ('UNRESOLVED','UNDER_INVESTIGATION','RESOLVED','ACCEPTED_A','ACCEPTED_B','INCONCLUSIVE')),
  project_id uuid references public.luna_projects(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (anchor_a_id <> anchor_b_id),
  unique (workspace_id, anchor_a_type, anchor_a_id, anchor_b_type, anchor_b_id)
);

create table if not exists public.luna_gap_profiles (
  gap_id uuid primary key references public.luna_knowledge_gaps(id) on delete restrict,
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  category text not null check (category in ('FACTUAL','RELATIONAL','CAUSAL','PROCEDURAL','CONTEXTUAL','TEMPORAL','PROVENANCE','CONTRADICTION','PROJECT','GOAL','SOCIAL','SELF_MODEL','UNKNOWN')),
  status text not null default 'OPEN' check (status in ('OPEN','WATCHING','RESOLVED','DISMISSED','MERGED','EXPIRED')),
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  canonical_gap_id uuid references public.luna_knowledge_gaps(id) on delete restrict,
  normalized_key text not null check (char_length(normalized_key) between 8 and 240),
  reopened_from_id uuid references public.luna_knowledge_gaps(id) on delete restrict,
  cooldown_until timestamptz,
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (canonical_gap_id is null or canonical_gap_id <> gap_id),
  unique (workspace_id, normalized_key)
);

create table if not exists public.luna_gap_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  gap_id uuid not null references public.luna_knowledge_gaps(id) on delete restrict,
  linked_type text not null check (char_length(linked_type) between 1 and 80),
  linked_id uuid not null,
  link_kind text not null check (link_kind in ('SOURCE','RELATED','MERGED_FROM','REOPENED_BY','BLOCKS','RESOLVES')),
  created_at timestamptz not null default now(),
  unique (workspace_id, gap_id, linked_type, linked_id, link_kind)
);

create table if not exists public.luna_curiosity_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  candidate_id uuid references public.luna_curiosity_candidates(id) on delete restrict,
  gap_id uuid references public.luna_knowledge_gaps(id) on delete restrict,
  trigger_type text not null check (char_length(trigger_type) between 1 and 80),
  trigger_id uuid not null,
  expected_information_value numeric(4,3) not null check (expected_information_value >= 0 and expected_information_value <= 1),
  novelty_score numeric(4,3) not null check (novelty_score >= 0 and novelty_score <= 1),
  importance numeric(4,3) not null check (importance >= 0 and importance <= 1),
  status text not null default 'CANDIDATE' check (status in ('CANDIDATE','INTERESTING','QUEUED','INVESTIGATING','SATISFIED','DEFERRED','DISMISSED','EXPIRED')),
  cooldown_until timestamptz,
  expires_at timestamptz,
  cycle_id uuid references public.luna_cognitive_cycles(id) on delete restrict,
  rationale text not null check (char_length(rationale) between 1 and 1600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, trigger_type, trigger_id)
);

create table if not exists public.luna_preferences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  preference_kind text not null check (preference_kind in ('USER','LEARNED','TASK','TEMPORARY','STABLE','CONTEXTUAL')),
  subject text not null check (char_length(subject) between 1 and 240),
  value text not null check (char_length(value) between 1 and 1600),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  is_active boolean not null default true,
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, preference_kind, subject, value)
);

create table if not exists public.luna_internal_state_observations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  dimension text not null check (dimension in ('SATISFACTION','FRUSTRATION','CURIOSITY','UNCERTAINTY','CONFIDENCE','URGENCY','SOCIAL_ATTACHMENT','LOAD','INTEREST','CONCERN','ANTICIPATION')),
  value numeric(4,3) not null check (value >= 0 and value <= 1),
  delta numeric(5,3) not null check (delta >= -1 and delta <= 1),
  reason text not null check (char_length(reason) between 1 and 1000),
  input_id uuid references public.luna_cognitive_inputs(id) on delete restrict,
  experience_id uuid references public.luna_experiences(id) on delete restrict,
  cycle_id uuid references public.luna_cognitive_cycles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.luna_self_model_facts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  fact_kind text not null check (fact_kind in ('OBSERVED','INFERRED','USER_ASSERTED')),
  facet text not null check (char_length(facet) between 1 and 120),
  statement text not null check (char_length(statement) between 1 and 1600),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','WEAKENED','ARCHIVED')),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, fact_kind, facet, statement)
);

create table if not exists public.luna_self_model_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  self_fact_id uuid not null references public.luna_self_model_facts(id) on delete restrict,
  source_type text not null check (char_length(source_type) between 1 and 80),
  source_id uuid not null,
  cycle_id uuid references public.luna_cognitive_cycles(id) on delete restrict,
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  created_at timestamptz not null default now(),
  unique (workspace_id, self_fact_id, source_type, source_id)
);

create table if not exists public.luna_goal_profiles (
  goal_id uuid primary key references public.luna_goals(id) on delete restrict,
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  origin text not null check (origin in ('OWNER','LUNA','SYSTEM')),
  importance numeric(4,3) not null check (importance >= 0 and importance <= 1),
  motivation text not null check (char_length(motivation) <= 1600),
  deadline_at timestamptz,
  success_criteria text not null default '' check (char_length(success_criteria) <= 1600),
  failure_criteria text not null default '' check (char_length(failure_criteria) <= 1600),
  status text not null default 'PROPOSED' check (status in ('PROPOSED','ACTIVE','PAUSED','COMPLETED','ABANDONED','SUPERSEDED','BLOCKED')),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_goal_dependencies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  goal_id uuid not null references public.luna_goals(id) on delete restrict,
  depends_on_goal_id uuid not null references public.luna_goals(id) on delete restrict,
  dependency_kind text not null check (dependency_kind in ('REQUIRES','BLOCKS','SUPPORTS')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SATISFIED','WAIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (goal_id <> depends_on_goal_id),
  unique (workspace_id, goal_id, depends_on_goal_id, dependency_kind)
);

create table if not exists public.luna_commitments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  project_id uuid references public.luna_projects(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  relationship_id uuid,
  title text not null check (char_length(title) between 1 and 240),
  detail text not null default '' check (char_length(detail) <= 1600),
  status text not null default 'PROPOSED' check (status in ('PROPOSED','ACTIVE','FULFILLED','RELEASED','BREACHED','EXPIRED')),
  due_at timestamptz,
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  external_action_required boolean not null default false,
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_hypotheses (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  project_id uuid references public.luna_projects(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  gap_id uuid references public.luna_knowledge_gaps(id) on delete restrict,
  statement text not null check (char_length(statement) between 1 and 1600),
  planned_test text not null default '' check (char_length(planned_test) <= 1600),
  confidence numeric(4,3) not null default 0.5 check (confidence >= 0 and confidence <= 1),
  status text not null default 'PROPOSED' check (status in ('PROPOSED','TESTING','SUPPORTED','WEAKENED','REJECTED','INCONCLUSIVE')),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.luna_hypothesis_evidence (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  hypothesis_id uuid not null references public.luna_hypotheses(id) on delete restrict,
  source_type text not null check (char_length(source_type) between 1 and 80),
  source_id uuid not null,
  evidence_role text not null check (evidence_role in ('SUPPORTS','CONTRADICTS','CONTEXT')),
  confidence numeric(4,3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  created_at timestamptz not null default now(),
  unique (workspace_id, hypothesis_id, source_type, source_id, evidence_role)
);

create table if not exists public.luna_reasoning_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  cycle_id uuid references public.luna_cognitive_cycles(id) on delete restrict,
  subject_type text not null check (char_length(subject_type) between 1 and 80),
  subject_id uuid not null,
  conclusion text not null check (char_length(conclusion) between 1 and 1600),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  uncertainty_summary text not null check (char_length(uncertainty_summary) between 1 and 1600),
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  recommendation text not null check (char_length(recommendation) between 1 and 1600),
  evidence_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_ids) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_plan_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  goal_id uuid references public.luna_goals(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  revision_kind text not null check (revision_kind in ('CREATED','REVISED','DEFERRED','SUPERSEDED')),
  summary text not null check (char_length(summary) between 1 and 1600),
  reason text not null check (char_length(reason) between 1 and 1600),
  alternatives jsonb not null default '[]'::jsonb check (jsonb_typeof(alternatives) = 'array'),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_learning_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  learning_kind text not null check (learning_kind in ('CORRECTION','OUTCOME','STRATEGY','PATTERN')),
  source_input_id uuid references public.luna_cognitive_inputs(id) on delete restrict,
  experience_id uuid references public.luna_experiences(id) on delete restrict,
  validation_id uuid references public.luna_result_validations(id) on delete restrict,
  target_type text not null check (char_length(target_type) between 1 and 80),
  target_id uuid not null,
  summary text not null check (char_length(summary) between 1 and 1600),
  confidence_delta numeric(5,3) not null check (confidence_delta >= -1 and confidence_delta <= 1),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_worker_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  worker_role text not null check (worker_role in ('SCOUT','RESEARCHER','VALIDATOR','ORGANIZER','LINKER','DATA_ANALYST','PROVENANCE_AGENT','LICENSE_AGENT','REVIEW_AGENT','MAINTENANCE_AGENT','MEMORY_AGENT','PLANNER_AGENT','REFLECTION_AGENT','SYNTHESIS_AGENT')),
  worker_id uuid references public.luna_workers(id) on delete restrict,
  mission_id uuid references public.luna_missions(id) on delete restrict,
  outcome text not null check (outcome in ('ACCEPTED','NEEDS_REVIEW','REJECTED','FAILED')),
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  strategy text not null default '' check (char_length(strategy) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  agent_identity text not null check (char_length(agent_identity) between 1 and 120),
  participant_identity text not null check (char_length(participant_identity) between 1 and 120),
  familiarity numeric(4,3) not null default 0 check (familiarity >= 0 and familiarity <= 1),
  trust numeric(4,3) not null default 0 check (trust >= 0 and trust <= 1),
  affinity numeric(4,3) not null default 0 check (affinity >= 0 and affinity <= 1),
  conflict numeric(4,3) not null default 0 check (conflict >= 0 and conflict <= 1),
  cooperation numeric(4,3) not null default 0 check (cooperation >= 0 and cooperation <= 1),
  expectations text not null default '' check (char_length(expectations) <= 1600),
  uncertainty numeric(4,3) not null default 1 check (uncertainty >= 0 and uncertainty <= 1),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','DORMANT','ARCHIVED')),
  current_version integer not null default 1 check (current_version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, agent_identity, participant_identity)
);

alter table public.luna_commitments drop constraint if exists luna_commitments_relationship_id_fkey;
alter table public.luna_commitments add constraint luna_commitments_relationship_id_fkey foreign key (relationship_id) references public.luna_relationships(id) on delete restrict;

create table if not exists public.luna_social_interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  relationship_id uuid not null references public.luna_relationships(id) on delete restrict,
  input_id uuid references public.luna_cognitive_inputs(id) on delete restrict,
  experience_id uuid references public.luna_experiences(id) on delete restrict,
  interaction_kind text not null check (interaction_kind in ('CONVERSATION','COOPERATION','CONFLICT','COMMITMENT','OBSERVATION')),
  summary text not null check (char_length(summary) between 1 and 1600),
  impact numeric(5,3) not null check (impact >= -1 and impact <= 1),
  provenance jsonb not null default '{}'::jsonb check (jsonb_typeof(provenance) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.luna_world_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  source_key text not null check (char_length(source_key) between 8 and 240),
  event_type text not null check (char_length(event_type) between 1 and 120),
  subject_identity text,
  object_identity text,
  location_ref text,
  occurred_at timestamptz,
  summary text not null check (char_length(summary) between 1 and 1600),
  constraints jsonb not null default '{}'::jsonb check (jsonb_typeof(constraints) = 'object'),
  consequences jsonb not null default '{}'::jsonb check (jsonb_typeof(consequences) = 'object'),
  input_id uuid references public.luna_cognitive_inputs(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (workspace_id, source_key)
);

create table if not exists public.luna_maintenance_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.luna_knowledge_workspaces(id) on delete restrict,
  cycle_id uuid references public.luna_cognitive_cycles(id) on delete restrict,
  scope text not null check (char_length(scope) between 1 and 240),
  evaluated_count integer not null default 0 check (evaluated_count between 0 and 100),
  updated_count integer not null default 0 check (updated_count between 0 and 16),
  issue_count integer not null default 0 check (issue_count between 0 and 100),
  status text not null check (status in ('COMPLETED','STOPPED','FAILED')),
  stop_reason text check (stop_reason is null or char_length(stop_reason) <= 1000),
  summary text not null check (char_length(summary) between 1 and 1600),
  created_at timestamptz not null default now()
);

-- The generic cognitive version stream remains the immutable version history for mutable records.
alter table public.luna_cognitive_versions drop constraint if exists luna_cognitive_versions_subject_type_check;
alter table public.luna_cognitive_versions add constraint luna_cognitive_versions_subject_type_check check (subject_type in (
  'STATE','MEMORY','PROJECT','GOAL','TASK','MISSION','WORKER','ATTENTION','REFLECTION','DECISION','RESULT_VALIDATION',
  'COGNITIVE_INPUT','EXPERIENCE','COGNITIVE_CYCLE','ATTENTION_ASSESSMENT','FOCUS','UNCERTAINTY','NOVELTY','CONTRADICTION',
  'GAP_PROFILE','CURIOSITY_ASSESSMENT','PREFERENCE','INTERNAL_STATE','SELF_MODEL_FACT','GOAL_PROFILE','GOAL_DEPENDENCY',
  'COMMITMENT','HYPOTHESIS','REASONING','PLAN_REVISION','LEARNING','WORKER_PERFORMANCE','RELATIONSHIP','SOCIAL_INTERACTION','WORLD_EVENT','MAINTENANCE_REPORT'
));

create index if not exists luna_cognitive_inputs_workspace_type_idx on public.luna_cognitive_inputs (workspace_id, input_type, created_at desc);
create index if not exists luna_experiences_workspace_kind_idx on public.luna_experiences (workspace_id, experience_kind, created_at desc);
create index if not exists luna_cycles_workspace_type_idx on public.luna_cognitive_cycles (workspace_id, cycle_type, created_at desc);
create index if not exists luna_attention_assessments_active_idx on public.luna_attention_assessments (workspace_id, state, score desc, updated_at desc) where state in ('ACTIVE','SUPPRESSED');
create index if not exists luna_focus_assignments_active_idx on public.luna_focus_assignments (workspace_id, replaced_at, tier, rank) where replaced_at is null;
create index if not exists luna_uncertainty_open_idx on public.luna_uncertainty_records (workspace_id, status, importance desc, score desc, updated_at desc) where status = 'OPEN';
create index if not exists luna_novelty_workspace_idx on public.luna_novelty_records (workspace_id, score desc, created_at desc);
create index if not exists luna_contradictions_open_idx on public.luna_contradictions (workspace_id, status, impact desc, updated_at desc) where status in ('UNRESOLVED','UNDER_INVESTIGATION');
create index if not exists luna_gap_profiles_open_idx on public.luna_gap_profiles (workspace_id, status, category, updated_at desc) where status in ('OPEN','WATCHING');
create index if not exists luna_curiosity_assessments_active_idx on public.luna_curiosity_assessments (workspace_id, status, importance desc, created_at desc) where status in ('CANDIDATE','INTERESTING','QUEUED','INVESTIGATING');
create index if not exists luna_preferences_active_idx on public.luna_preferences (workspace_id, is_active, preference_kind, updated_at desc) where is_active;
create index if not exists luna_internal_state_workspace_dim_idx on public.luna_internal_state_observations (workspace_id, dimension, created_at desc);
create index if not exists luna_self_model_facts_active_idx on public.luna_self_model_facts (workspace_id, status, fact_kind, updated_at desc) where status = 'ACTIVE';
create index if not exists luna_self_model_evidence_fact_idx on public.luna_self_model_evidence (workspace_id, self_fact_id, created_at desc);
create index if not exists luna_goal_profiles_active_idx on public.luna_goal_profiles (workspace_id, status, importance desc, deadline_at);
create index if not exists luna_goal_dependencies_goal_idx on public.luna_goal_dependencies (workspace_id, goal_id, status);
create index if not exists luna_commitments_active_idx on public.luna_commitments (workspace_id, status, due_at, updated_at desc) where status in ('PROPOSED','ACTIVE');
create index if not exists luna_hypotheses_active_idx on public.luna_hypotheses (workspace_id, status, confidence desc, updated_at desc) where status in ('PROPOSED','TESTING','WEAKENED');
create index if not exists luna_hypothesis_evidence_idx on public.luna_hypothesis_evidence (workspace_id, hypothesis_id, evidence_role, created_at desc);
create index if not exists luna_reasoning_artifacts_subject_idx on public.luna_reasoning_artifacts (workspace_id, subject_type, subject_id, created_at desc);
create index if not exists luna_plan_revisions_subject_idx on public.luna_plan_revisions (workspace_id, goal_id, mission_id, created_at desc);
create index if not exists luna_learning_records_target_idx on public.luna_learning_records (workspace_id, target_type, target_id, created_at desc);
create index if not exists luna_worker_performance_role_idx on public.luna_worker_performance_snapshots (workspace_id, worker_role, outcome, created_at desc);
create index if not exists luna_relationships_active_idx on public.luna_relationships (workspace_id, status, updated_at desc) where status = 'ACTIVE';
create index if not exists luna_social_interactions_relationship_idx on public.luna_social_interactions (workspace_id, relationship_id, created_at desc);
create index if not exists luna_world_events_workspace_type_idx on public.luna_world_events (workspace_id, event_type, occurred_at desc nulls last, created_at desc);
create index if not exists luna_maintenance_reports_workspace_idx on public.luna_maintenance_reports (workspace_id, created_at desc);

-- All append-only records retain their original evidence and cannot be altered or deleted.
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'luna_cognitive_inputs','luna_experiences','luna_cognitive_cycles','luna_focus_assignments','luna_novelty_records',
    'luna_gap_links','luna_internal_state_observations','luna_self_model_evidence','luna_hypothesis_evidence','luna_reasoning_artifacts',
    'luna_plan_revisions','luna_learning_records','luna_worker_performance_snapshots','luna_social_interactions','luna_world_events','luna_maintenance_reports'
  ] loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_immutable', tbl);
    execute format('create trigger %I before update or delete on public.%I for each row execute function public.luna_prevent_cognitive_audit_mutation()', tbl || '_immutable', tbl);
  end loop;
  foreach tbl in array array[
    'luna_attention_assessments','luna_uncertainty_records','luna_contradictions','luna_gap_profiles','luna_curiosity_assessments',
    'luna_preferences','luna_self_model_facts','luna_goal_profiles','luna_goal_dependencies','luna_commitments','luna_hypotheses','luna_relationships'
  ] loop
    execute format('drop trigger if exists %I on public.%I', tbl || '_touch', tbl);
    execute format('create trigger %I before update on public.%I for each row execute function public.luna_cognitive_touch_updated_at()', tbl || '_touch', tbl);
  end loop;
end $$;

alter table public.luna_cognitive_inputs enable row level security;
alter table public.luna_experiences enable row level security;
alter table public.luna_cognitive_cycles enable row level security;
alter table public.luna_attention_assessments enable row level security;
alter table public.luna_focus_assignments enable row level security;
alter table public.luna_uncertainty_records enable row level security;
alter table public.luna_novelty_records enable row level security;
alter table public.luna_contradictions enable row level security;
alter table public.luna_gap_profiles enable row level security;
alter table public.luna_gap_links enable row level security;
alter table public.luna_curiosity_assessments enable row level security;
alter table public.luna_preferences enable row level security;
alter table public.luna_internal_state_observations enable row level security;
alter table public.luna_self_model_facts enable row level security;
alter table public.luna_self_model_evidence enable row level security;
alter table public.luna_goal_profiles enable row level security;
alter table public.luna_goal_dependencies enable row level security;
alter table public.luna_commitments enable row level security;
alter table public.luna_hypotheses enable row level security;
alter table public.luna_hypothesis_evidence enable row level security;
alter table public.luna_reasoning_artifacts enable row level security;
alter table public.luna_plan_revisions enable row level security;
alter table public.luna_learning_records enable row level security;
alter table public.luna_worker_performance_snapshots enable row level security;
alter table public.luna_relationships enable row level security;
alter table public.luna_social_interactions enable row level security;
alter table public.luna_world_events enable row level security;
alter table public.luna_maintenance_reports enable row level security;

-- No anon/authenticated policies are created. All access is server-side, owner-scoped, and auditable.
select pg_notify('pgrst', 'reload schema');
