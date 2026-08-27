-- Read-only verifier for Luna Phase 2 Milestone 5 cognitive-action-loop migration.
-- Expected result: every row reports passed = true.

with checks as (
  select 'table.luna_autonomous_decisions'::text as check_name,
    to_regclass('public.luna_autonomous_decisions') is not null as passed,
    coalesce(to_regclass('public.luna_autonomous_decisions')::text, 'missing') as observed
  union all
  select 'table.luna_result_validations',
    to_regclass('public.luna_result_validations') is not null,
    coalesce(to_regclass('public.luna_result_validations')::text, 'missing')
  union all
  select 'column.luna_cognitive_state.cognitive_actions_enabled',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'luna_cognitive_state'
        and column_name = 'cognitive_actions_enabled'
        and is_nullable = 'NO' and column_default ilike '%false%'
    ),
    coalesce((
      select column_name || ' nullable=' || is_nullable || ' default=' || coalesce(column_default, 'null')
      from information_schema.columns
      where table_schema = 'public' and table_name = 'luna_cognitive_state'
        and column_name = 'cognitive_actions_enabled'
    ), 'missing')
  union all
  select 'column.luna_missions.decision_id',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'luna_missions' and column_name = 'decision_id'
    ),
    coalesce((
      select column_name || ' nullable=' || is_nullable
      from information_schema.columns
      where table_schema = 'public' and table_name = 'luna_missions' and column_name = 'decision_id'
    ), 'missing')
  union all
  select 'column.luna_missions.mission_origin',
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'luna_missions'
        and column_name = 'mission_origin' and is_nullable = 'NO'
        and column_default ilike '%OWNER%'
    ),
    coalesce((
      select column_name || ' nullable=' || is_nullable || ' default=' || coalesce(column_default, 'null')
      from information_schema.columns
      where table_schema = 'public' and table_name = 'luna_missions' and column_name = 'mission_origin'
    ), 'missing')
  union all
  select 'rls.luna_autonomous_decisions',
    coalesce((select relrowsecurity from pg_class where oid = 'public.luna_autonomous_decisions'::regclass), false),
    coalesce((select relrowsecurity::text from pg_class where oid = 'public.luna_autonomous_decisions'::regclass), 'missing')
  union all
  select 'rls.luna_result_validations',
    coalesce((select relrowsecurity from pg_class where oid = 'public.luna_result_validations'::regclass), false),
    coalesce((select relrowsecurity::text from pg_class where oid = 'public.luna_result_validations'::regclass), 'missing')
  union all
  select 'policy.no_anon_or_authenticated_direct_access',
    not exists (
      select 1
      from pg_policies p
      cross join lateral unnest(p.roles) as role_name
      where p.schemaname = 'public'
        and p.tablename in ('luna_autonomous_decisions', 'luna_result_validations')
        and role_name::text in ('anon', 'authenticated')
    ),
    coalesce((
      select string_agg(p.tablename || ':' || role_name::text, ', ' order by p.tablename, role_name::text)
      from pg_policies p
      cross join lateral unnest(p.roles) as role_name
      where p.schemaname = 'public'
        and p.tablename in ('luna_autonomous_decisions', 'luna_result_validations')
        and role_name::text in ('anon', 'authenticated')
    ), 'none')
  union all
  select 'index.luna_missions_decision_unique_idx',
    to_regclass('public.luna_missions_decision_unique_idx') is not null,
    coalesce(to_regclass('public.luna_missions_decision_unique_idx')::text, 'missing')
  union all
  select 'index.luna_autonomous_decisions_workspace_status_idx',
    to_regclass('public.luna_autonomous_decisions_workspace_status_idx') is not null,
    coalesce(to_regclass('public.luna_autonomous_decisions_workspace_status_idx')::text, 'missing')
  union all
  select 'index.luna_autonomous_decisions_source_idx',
    to_regclass('public.luna_autonomous_decisions_source_idx') is not null,
    coalesce(to_regclass('public.luna_autonomous_decisions_source_idx')::text, 'missing')
  union all
  select 'index.luna_result_validations_mission_idx',
    to_regclass('public.luna_result_validations_mission_idx') is not null,
    coalesce(to_regclass('public.luna_result_validations_mission_idx')::text, 'missing')
  union all
  select 'index.luna_result_validations_worker_idx',
    to_regclass('public.luna_result_validations_worker_idx') is not null,
    coalesce(to_regclass('public.luna_result_validations_worker_idx')::text, 'missing')
  union all
  select 'foreign_key.luna_missions.decision_id',
    exists (
      select 1 from pg_constraint
      where conname = 'luna_missions_decision_id_fkey'
        and conrelid = 'public.luna_missions'::regclass
        and confrelid = 'public.luna_autonomous_decisions'::regclass
        and contype = 'f'
    ),
    coalesce((
      select pg_get_constraintdef(oid)
      from pg_constraint where conname = 'luna_missions_decision_id_fkey'
        and conrelid = 'public.luna_missions'::regclass
    ), 'missing')
  union all
  select 'trigger.luna_luna_autonomous_decisions_touch',
    exists (
      select 1 from pg_trigger
      where tgname = 'luna_luna_autonomous_decisions_touch'
        and tgrelid = 'public.luna_autonomous_decisions'::regclass
        and not tgisinternal
    ),
    coalesce((
      select tgname from pg_trigger
      where tgname = 'luna_luna_autonomous_decisions_touch'
        and tgrelid = 'public.luna_autonomous_decisions'::regclass
        and not tgisinternal
    ), 'missing')
  union all
  select 'trigger.luna_result_validations_immutable',
    exists (
      select 1 from pg_trigger
      where tgname = 'luna_result_validations_immutable'
        and tgrelid = 'public.luna_result_validations'::regclass
        and not tgisinternal
    ),
    coalesce((
      select tgname from pg_trigger
      where tgname = 'luna_result_validations_immutable'
        and tgrelid = 'public.luna_result_validations'::regclass
        and not tgisinternal
    ), 'missing')
  union all
  select 'function.luna_prevent_result_validation_mutation',
    to_regprocedure('public.luna_prevent_result_validation_mutation()') is not null,
    coalesce(to_regprocedure('public.luna_prevent_result_validation_mutation()')::text, 'missing')
  union all
  select 'constraint.luna_cognitive_versions_subject_type_check',
    exists (
      select 1 from pg_constraint
      where conname = 'luna_cognitive_versions_subject_type_check'
        and conrelid = 'public.luna_cognitive_versions'::regclass
        and pg_get_constraintdef(oid) like '%DECISION%'
        and pg_get_constraintdef(oid) like '%RESULT_VALIDATION%'
    ),
    coalesce((
      select pg_get_constraintdef(oid)
      from pg_constraint where conname = 'luna_cognitive_versions_subject_type_check'
        and conrelid = 'public.luna_cognitive_versions'::regclass
    ), 'missing')
)
select check_name, passed, observed
from checks
order by check_name;
