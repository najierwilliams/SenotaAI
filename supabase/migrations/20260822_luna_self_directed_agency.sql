-- Luna self-directed agency extension.
-- This migration increases inspectable operational self-regulation. It does not assert
-- consciousness, sentience, subjective experience, moral responsibility, or philosophical free will.

alter table public.npc_agent_goals
  add column if not exists priority real not null default 0.5 check (priority between 0 and 1),
  add column if not exists commitment real not null default 0.15 check (commitment between 0 and 1),
  add column if not exists completion_criteria text not null default '' check (char_length(completion_criteria) <= 2000),
  add column if not exists protected boolean not null default false,
  add column if not exists evaluation_count integer not null default 0 check (evaluation_count >= 0),
  add column if not exists last_evaluated_at timestamptz;

alter table public.npc_agent_decisions
  add column if not exists decision_mode text not null default 'mixed-self-directed'
    check (decision_mode in ('user-responsive','goal-regulated','preference-shaped','belief-guided','state-regulated','safety-constrained','mixed-self-directed')),
  add column if not exists communication_intent text not null default 'engage'
    check (communication_intent in ('engage','clarify','disagree','decline','defer','reflect-briefly')),
  add column if not exists ownership_summary jsonb not null default '{}'::jsonb;

create table if not exists public.npc_agent_goal_evaluations (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  goal_id uuid references public.npc_agent_goals(id) on delete set null,
  trigger_event_id uuid references public.npc_agent_events(id) on delete set null,
  trigger_decision_id uuid references public.npc_agent_decisions(id) on delete set null,
  reason text not null check (char_length(reason) between 4 and 2000),
  discrepancy real not null default 0.5 check (discrepancy between 0 and 1),
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  evidence_event_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.npc_agent_decision_factors (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  decision_id uuid not null references public.npc_agent_decisions(id) on delete cascade,
  factor_kind text not null check (factor_kind in ('user-direction','developer-constraint','safety-constraint','belief','learned-preference','goal','internal-state','counterfactual')),
  factor_key text not null check (char_length(factor_key) between 1 and 240),
  raw_contribution real not null default 0,
  normalized_contribution real not null default 0 check (normalized_contribution between 0 and 1),
  source_record_ids jsonb not null default '[]'::jsonb,
  rationale text not null default '' check (char_length(rationale) <= 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.npc_agent_counterfactuals (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  decision_id uuid not null references public.npc_agent_decisions(id) on delete cascade,
  action text not null check (action in ('available','dialogue','reflect','rest','defer','observe')),
  intention text not null default '' check (char_length(intention) <= 2000),
  predicted_outcome text not null default '' check (char_length(predicted_outcome) <= 2000),
  expected_score real not null default 0,
  selected boolean not null default false,
  outcome_comparison text,
  calibration_error real check (calibration_error between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_agent_self_models (
  npc_id text primary key references public.npc_canon_sources(npc_id) on delete cascade,
  summary text not null default '' check (char_length(summary) <= 4000),
  demonstrated_capabilities jsonb not null default '[]'::jsonb,
  unresolved_uncertainties jsonb not null default '[]'::jsonb,
  active_commitments jsonb not null default '[]'::jsonb,
  evidence_event_ids jsonb not null default '[]'::jsonb,
  revision_count integer not null default 0 check (revision_count >= 0),
  last_decision_id uuid references public.npc_agent_decisions(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists npc_agent_goals_priority_idx
  on public.npc_agent_goals (npc_id, status, protected, priority desc, commitment desc, updated_at desc);
create index if not exists npc_agent_goal_evaluations_timeline_idx
  on public.npc_agent_goal_evaluations (npc_id, goal_id, created_at desc);
create index if not exists npc_agent_decision_factors_decision_idx
  on public.npc_agent_decision_factors (decision_id, normalized_contribution desc, created_at asc);
create index if not exists npc_agent_counterfactuals_decision_idx
  on public.npc_agent_counterfactuals (decision_id, selected desc, created_at asc);

alter table public.npc_agent_goal_evaluations enable row level security;
alter table public.npc_agent_decision_factors enable row level security;
alter table public.npc_agent_counterfactuals enable row level security;
alter table public.npc_agent_self_models enable row level security;
