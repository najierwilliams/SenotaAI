-- Luna autonomous-agent substrate.
-- This schema records operational cognition and decision traces. It does not assert
-- consciousness, moral responsibility, or philosophical free will.

create table if not exists public.npc_agent_state (
  npc_id text primary key references public.npc_canon_sources(npc_id) on delete cascade,
  mode text not null default 'active' check (mode in ('active','paused','observation-only')),
  current_intention text,
  current_activity text not null default 'available' check (char_length(current_activity) <= 120),
  active_values jsonb not null default '["canon-consistency","epistemic-humility","constructive-dialogue","memory-continuity"]'::jsonb,
  attention_budget real not null default 1 check (attention_budget between 0 and 1),
  last_deliberated_at timestamptz,
  next_cycle_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_agent_events (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  event_kind text not null check (event_kind in ('dialogue','creator-input','time','outcome','reflection','system')),
  content text not null check (char_length(content) between 1 and 8000),
  source text not null check (char_length(source) between 1 and 160),
  source_reliability real not null default 0.5 check (source_reliability between 0 and 1),
  salience smallint not null default 3 check (salience between 1 and 5),
  metadata jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.npc_agent_beliefs (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  statement text not null check (char_length(statement) between 4 and 2000),
  confidence real not null default 0.5 check (confidence between 0 and 1),
  source_reliability real not null default 0.5 check (source_reliability between 0 and 1),
  evidence_event_ids jsonb not null default '[]'::jsonb,
  contradiction_belief_ids jsonb not null default '[]'::jsonb,
  implication_summary text not null default '' check (char_length(implication_summary) <= 2000),
  status text not null default 'hypothesis' check (status in ('hypothesis','active','retracted','superseded')),
  revision_count integer not null default 0 check (revision_count >= 0),
  origin text not null default 'autonomous-deliberation' check (char_length(origin) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_agent_preferences (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  dimension text not null check (char_length(dimension) between 2 and 160),
  context_scope text not null default 'general' check (char_length(context_scope) <= 240),
  direction text not null check (direction in ('favor','avoid','neutral')),
  weight real not null default 0 check (weight between -1 and 1),
  stability real not null default 0.3 check (stability between 0 and 1),
  basis text not null check (char_length(basis) between 4 and 2000),
  supporting_event_ids jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','retracted','superseded')),
  origin text not null default 'autonomous-deliberation' check (char_length(origin) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_agent_goals (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  goal_text text not null check (char_length(goal_text) between 4 and 2000),
  origin text not null check (char_length(origin) <= 160),
  utility real not null default 0.5 check (utility between 0 and 1),
  feasibility real not null default 0.5 check (feasibility between 0 and 1),
  urgency real not null default 0.5 check (urgency between 0 and 1),
  progress real not null default 0 check (progress between 0 and 1),
  parent_goal_id uuid,
  evidence_event_ids jsonb not null default '[]'::jsonb,
  status text not null default 'candidate' check (status in ('candidate','active','completed','deferred','abandoned','replaced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_agent_decisions (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  trigger_event_id uuid references public.npc_agent_events(id) on delete set null,
  trigger text not null check (char_length(trigger) between 1 and 2000),
  candidate_options jsonb not null default '[]'::jsonb,
  chosen_option jsonb not null default '{}'::jsonb,
  score_breakdown jsonb not null default '{}'::jsonb,
  uncertainty real not null default 0.5 check (uncertainty between 0 and 1),
  intention text not null default '' check (char_length(intention) <= 2000),
  rationale text not null default '' check (char_length(rationale) <= 4000),
  safety_result text not null default 'internal-only' check (safety_result in ('internal-only','allowed','blocked','deferred')),
  status text not null default 'selected' check (status in ('selected','completed','cancelled','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_agent_outcomes (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  decision_id uuid not null references public.npc_agent_decisions(id) on delete cascade,
  observation text not null check (char_length(observation) between 1 and 4000),
  predicted_outcome text not null default '' check (char_length(predicted_outcome) <= 2000),
  prediction_error real not null default 0.5 check (prediction_error between 0 and 1),
  valence real not null default 0 check (valence between -1 and 1),
  feedback_source text not null check (char_length(feedback_source) between 1 and 160),
  state_delta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.npc_agent_behavior_episodes (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  decision_id uuid references public.npc_agent_decisions(id) on delete set null,
  activity text not null check (activity in ('available','dialogue','reflect','rest','defer','observe')),
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  planned_outcome text not null default '' check (char_length(planned_outcome) <= 2000),
  actual_outcome text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_agent_history (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  event_type text not null check (char_length(event_type) <= 160),
  record_type text not null check (char_length(record_type) <= 160),
  record_id text,
  caused_by_event_id uuid references public.npc_agent_events(id) on delete set null,
  caused_by_decision_id uuid references public.npc_agent_decisions(id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  actor text not null default 'luna-autonomous-loop' check (char_length(actor) <= 160),
  created_at timestamptz not null default now()
);

create index if not exists npc_agent_events_queue_idx on public.npc_agent_events (npc_id, processed_at, salience desc, created_at asc);
create index if not exists npc_agent_beliefs_context_idx on public.npc_agent_beliefs (npc_id, status, confidence desc, updated_at desc);
create index if not exists npc_agent_preferences_context_idx on public.npc_agent_preferences (npc_id, status, stability desc, updated_at desc);
create index if not exists npc_agent_goals_context_idx on public.npc_agent_goals (npc_id, status, utility desc, urgency desc, updated_at desc);
create index if not exists npc_agent_decisions_timeline_idx on public.npc_agent_decisions (npc_id, created_at desc);
create index if not exists npc_agent_outcomes_decision_idx on public.npc_agent_outcomes (decision_id, created_at desc);
create index if not exists npc_agent_behavior_active_idx on public.npc_agent_behavior_episodes (npc_id, status, starts_at desc);
create index if not exists npc_agent_history_timeline_idx on public.npc_agent_history (npc_id, created_at desc);

alter table public.npc_agent_state enable row level security;
alter table public.npc_agent_events enable row level security;
alter table public.npc_agent_beliefs enable row level security;
alter table public.npc_agent_preferences enable row level security;
alter table public.npc_agent_goals enable row level security;
alter table public.npc_agent_decisions enable row level security;
alter table public.npc_agent_outcomes enable row level security;
alter table public.npc_agent_behavior_episodes enable row level security;
alter table public.npc_agent_history enable row level security;
