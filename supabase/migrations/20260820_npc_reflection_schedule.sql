-- Durable review-only reflection rhythm. This row stores scheduling metadata only;
-- cognitive state remains unchanged until an administrator applies a reflection card.
create table if not exists public.npc_reflection_schedules (
  npc_id text primary key references public.npc_canon_sources(npc_id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'failed')),
  time_zone text not null default 'America/New_York' check (char_length(time_zone) between 1 and 64),
  daily_target smallint not null default 6 check (daily_target between 1 and 8),
  runs_today smallint not null default 0 check (runs_today >= 0),
  day_key date,
  schedule_cron_task_uid text unique,
  next_eligible_at timestamptz,
  last_run_at timestamptz,
  last_reflection_id uuid references public.npc_cognitive_reflections(id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists npc_reflection_schedules_status_idx
  on public.npc_reflection_schedules (status);

alter table public.npc_reflection_schedules enable row level security;
