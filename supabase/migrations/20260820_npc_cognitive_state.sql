-- Persistent NPC cognitive state. User-authored Obsidian Personality and Brain canon remains in npc_canon_sources.

create table if not exists public.npc_cognitive_state (
  npc_id text primary key references public.npc_canon_sources(npc_id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  self_model jsonb not null default '{"summary":"No approved self-model baseline has been recorded yet.","abilities":[],"limitations":[],"preferences":[],"values":[],"skills":[],"uncertainties":[],"personal_history":[]}'::jsonb,
  self_awareness jsonb not null default '{"identityContinuity":0,"memoryContinuity":0,"selfModelDevelopment":0,"selfModelConfidence":0,"selfReflectionCapability":0,"behavioralSelfAwareness":0,"goalAwareness":0,"uncertaintyAwareness":0}'::jsonb,
  emotional_state jsonb not null default '{"label":"unassessed","valence":0,"arousal":0,"notes":"No approved emotional-state update has been recorded yet."}'::jsonb,
  needs jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '[]'::jsonb,
  uncertainties jsonb not null default '[]'::jsonb,
  state_summary text not null default 'No approved cognitive-state baseline has been recorded yet.' check (char_length(state_summary) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_cognitive_memories (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  memory_kind text not null check (memory_kind in ('episodic','semantic','procedural','social','emotional')),
  content text not null check (char_length(content) between 4 and 4000),
  importance smallint not null default 3 check (importance between 1 and 5),
  emotional_significance real not null default 0 check (emotional_significance between -1 and 1),
  entities jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  source text not null default 'admin-approved' check (char_length(source) <= 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_cognitive_beliefs (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  statement text not null check (char_length(statement) between 4 and 2000),
  confidence real not null default 0.5 check (confidence between 0 and 1),
  evidence jsonb not null default '[]'::jsonb,
  supporting_memory_ids jsonb not null default '[]'::jsonb,
  contradicting_memory_ids jsonb not null default '[]'::jsonb,
  status text not null default 'active' check (status in ('active','retracted','superseded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_cognitive_goals (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  title text not null check (char_length(title) between 3 and 240),
  details text not null default '' check (char_length(details) <= 4000),
  priority smallint not null default 3 check (priority between 1 and 5),
  progress real not null default 0 check (progress between 0 and 1),
  status text not null default 'active' check (status in ('active','completed','failed','abandoned','replaced')),
  source text not null default 'admin-approved' check (char_length(source) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.npc_cognitive_relationships (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  entity_key text not null check (entity_key ~ '^[a-z0-9][a-z0-9-]{1,63}$'),
  display_name text not null check (char_length(display_name) between 1 and 240),
  dimensions jsonb not null default '{"trust":0,"affection":0,"respect":0,"familiarity":0,"loyalty":0,"dependence":0,"fear":0,"admiration":0,"resentment":0}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (npc_id, entity_key)
);

create table if not exists public.npc_cognitive_reflections (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  experience text not null check (char_length(experience) between 4 and 8000),
  proposal jsonb not null,
  status text not null default 'proposed' check (status in ('proposed','applied','rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by text
);

create table if not exists public.npc_cognitive_history (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  event_type text not null check (char_length(event_type) <= 120),
  record_type text not null check (char_length(record_type) <= 120),
  record_id text,
  before_state jsonb,
  after_state jsonb,
  source text not null check (char_length(source) <= 120),
  created_at timestamptz not null default now()
);

create index if not exists npc_cognitive_memories_retrieval_idx on public.npc_cognitive_memories (npc_id, is_active, importance desc, updated_at desc);
create index if not exists npc_cognitive_beliefs_retrieval_idx on public.npc_cognitive_beliefs (npc_id, status, confidence desc, updated_at desc);
create index if not exists npc_cognitive_goals_retrieval_idx on public.npc_cognitive_goals (npc_id, status, priority desc, updated_at desc);
create index if not exists npc_cognitive_reflections_review_idx on public.npc_cognitive_reflections (npc_id, status, created_at desc);
create index if not exists npc_cognitive_history_timeline_idx on public.npc_cognitive_history (npc_id, created_at desc);

alter table public.npc_cognitive_state enable row level security;
alter table public.npc_cognitive_memories enable row level security;
alter table public.npc_cognitive_beliefs enable row level security;
alter table public.npc_cognitive_goals enable row level security;
alter table public.npc_cognitive_relationships enable row level security;
alter table public.npc_cognitive_reflections enable row level security;
alter table public.npc_cognitive_history enable row level security;
