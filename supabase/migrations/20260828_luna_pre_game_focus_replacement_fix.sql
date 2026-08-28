-- Luna pre-game cognitive architecture: focus-history lifecycle correction.
-- Additive follow-up to 20260827_luna_pre_game_cognitive_master.sql.
-- No provider, scientific mapping, Queue, autonomy, or owner-policy data is modified.

-- Focus assignments are append-only cognitive evidence except for the single terminal
-- `replaced_at` marker required to preserve focus history when a newer allocation replaces it.
create or replace function public.luna_prevent_focus_assignment_history_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE'
     and old.replaced_at is null
     and new.replaced_at is not null
     and (to_jsonb(new) - 'replaced_at') = (to_jsonb(old) - 'replaced_at') then
    return new;
  end if;
  raise exception 'Luna focus assignment history permits only its one-way replacement timestamp';
end;
$$;

drop trigger if exists luna_focus_assignments_immutable on public.luna_focus_assignments;
create trigger luna_focus_assignments_immutable
before update or delete on public.luna_focus_assignments
for each row execute function public.luna_prevent_focus_assignment_history_mutation();
