-- Cognitive substrate expansion: raw observations stay separate from approved cognitive facts.
-- This is intentionally review-first: observations can produce proposals, but never mutate beliefs,
-- goals, memories, or the self-model without an administrator Apply decision.

create table if not exists public.npc_cognitive_observations (
  id uuid primary key default gen_random_uuid(),
  npc_id text not null references public.npc_canon_sources(npc_id) on delete cascade,
  observation_kind text not null check (observation_kind in ('interaction','world-event','administrator-note','self-review')),
  content text not null check (char_length(content) between 4 and 8000),
  salience smallint not null default 3 check (salience between 1 and 5),
  entities jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  source text not null default 'administrator' check (char_length(source) <= 120),
  status text not null default 'pending' check (status in ('pending','proposed','applied','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.npc_cognitive_memories
  add column if not exists reinforcement_count integer not null default 0 check (reinforcement_count >= 0),
  add column if not exists last_reinforced_at timestamptz;

alter table public.npc_cognitive_reflections
  add column if not exists source_observation_ids jsonb not null default '[]'::jsonb;

create index if not exists npc_cognitive_observations_review_idx
  on public.npc_cognitive_observations (npc_id, status, salience desc, created_at asc);

alter table public.npc_cognitive_observations enable row level security;
