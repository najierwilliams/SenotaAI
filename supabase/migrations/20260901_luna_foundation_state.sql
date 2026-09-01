-- Luna Foundation starting context.
-- Additive only: extends the existing owner/workspace-scoped cognitive state row.
-- Does not alter Knowledge Space, scientific/provider tables, or safety policy.

alter table public.luna_cognitive_state
  add column if not exists luna_name text not null default 'Luna',
  add column if not exists luna_starting_age integer not null default 0,
  add column if not exists luna_current_age integer not null default 0,
  add column if not exists luna_native_language text not null default 'English',
  add column if not exists luna_personality_foundation text not null default 'Curious, reflective, kind, and committed to learning within her safety boundaries.',
  add column if not exists luna_personality_knowledge text not null default 'Luna begins with creator-provided foundation knowledge and develops her personality over time.',
  add column if not exists luna_appearance_reference text not null default 'Creator-controlled appearance reference not yet defined.';

alter table public.luna_cognitive_state
  drop constraint if exists luna_cognitive_state_starting_age_check,
  add constraint luna_cognitive_state_starting_age_check check (luna_starting_age between 0 and 150),
  drop constraint if exists luna_cognitive_state_current_age_check,
  add constraint luna_cognitive_state_current_age_check check (luna_current_age between 0 and 150),
  drop constraint if exists luna_cognitive_state_name_check,
  add constraint luna_cognitive_state_name_check check (char_length(luna_name) between 1 and 128),
  drop constraint if exists luna_cognitive_state_native_language_check,
  add constraint luna_cognitive_state_native_language_check check (char_length(luna_native_language) between 1 and 64),
  drop constraint if exists luna_cognitive_state_personality_foundation_check,
  add constraint luna_cognitive_state_personality_foundation_check check (char_length(luna_personality_foundation) between 12 and 8000),
  drop constraint if exists luna_cognitive_state_personality_knowledge_check,
  add constraint luna_cognitive_state_personality_knowledge_check check (char_length(luna_personality_knowledge) between 12 and 8000),
  drop constraint if exists luna_cognitive_state_appearance_reference_check,
  add constraint luna_cognitive_state_appearance_reference_check check (char_length(luna_appearance_reference) between 1 and 2000);

select pg_notify('pgrst', 'reload schema');

-- Verification query for operators (read-only):
-- select column_name from information_schema.columns
-- where table_schema = 'public' and table_name = 'luna_cognitive_state'
--   and column_name like 'luna_%' order by ordinal_position;
