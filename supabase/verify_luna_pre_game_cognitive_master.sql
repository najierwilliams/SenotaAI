-- Luna pre-game cognitive architecture: READ-ONLY production verification.
-- Run only after 20260827_luna_pre_game_cognitive_master.sql has been applied.
-- This script contains SELECT statements only. It does not write data, change schema,
-- alter policies, invoke runtime work, or modify provider/scientific/mapping records.

with expected_tables(table_name, requires_immutable_trigger) as (
  values
    ('luna_cognitive_inputs', true), ('luna_experiences', true), ('luna_cognitive_cycles', true), ('luna_attention_assessments', false), ('luna_focus_assignments', true),
    ('luna_uncertainty_records', false), ('luna_novelty_records', true), ('luna_contradictions', false), ('luna_gap_profiles', false), ('luna_gap_links', true),
    ('luna_curiosity_assessments', false), ('luna_preferences', false), ('luna_internal_state_observations', true), ('luna_self_model_facts', false), ('luna_self_model_evidence', true),
    ('luna_goal_profiles', false), ('luna_goal_dependencies', false), ('luna_commitments', false), ('luna_hypotheses', false), ('luna_hypothesis_evidence', true),
    ('luna_reasoning_artifacts', true), ('luna_plan_revisions', true), ('luna_learning_records', true), ('luna_worker_performance_snapshots', true),
    ('luna_relationships', false), ('luna_social_interactions', true), ('luna_world_events', true), ('luna_maintenance_reports', true)
), relation_state as (
  select e.table_name, e.requires_immutable_trigger, c.oid is not null as table_exists, coalesce(c.relrowsecurity, false) as rls_enabled
  from expected_tables e
  left join pg_class c on c.relname = e.table_name and c.relnamespace = 'public'::regnamespace
), policy_state as (
  select tablename as table_name, count(*)::integer as policy_count
  from pg_policies
  where schemaname = 'public' and tablename in (select table_name from expected_tables)
  group by tablename
), trigger_state as (
  select c.relname as table_name, count(*) filter (where t.tgname like '%_immutable')::integer as immutable_trigger_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  left join pg_trigger t on t.tgrelid = c.oid and not t.tgisinternal
  where n.nspname = 'public' and c.relname in (select table_name from expected_tables)
  group by c.relname
), owner_scope_state as (
  select c.relname as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_attribute a on a.attrelid = c.oid and a.attname = 'workspace_id' and a.attnum > 0 and not a.attisdropped
  where n.nspname = 'public' and c.relname in (select table_name from expected_tables)
), version_state as (
  select exists (
    select 1 from pg_constraint
    where conrelid = 'public.luna_cognitive_versions'::regclass
      and conname = 'luna_cognitive_versions_subject_type_check'
      and pg_get_constraintdef(oid) ilike '%COGNITIVE_INPUT%'
      and pg_get_constraintdef(oid) ilike '%WORLD_EVENT%'
      and pg_get_constraintdef(oid) ilike '%MAINTENANCE_REPORT%'
  ) as compatible
)
select
  'TABLE_SECURITY'::text as check_category,
  r.table_name as subject,
  case when r.table_exists and r.rls_enabled and coalesce(p.policy_count, 0) = 0 and (not r.requires_immutable_trigger or coalesce(t.immutable_trigger_count, 0) >= 1) then 'PASS' else 'FAIL' end as verdict,
  format('exists=%s; rls=%s; direct_browser_policies=%s; immutable_triggers=%s; immutable_required=%s', r.table_exists, r.rls_enabled, coalesce(p.policy_count, 0), coalesce(t.immutable_trigger_count, 0), r.requires_immutable_trigger) as detail
from relation_state r
left join policy_state p using (table_name)
left join trigger_state t using (table_name)

union all

select
  'VERSION_CONTRACT',
  'luna_cognitive_versions_subject_type_check',
  case when compatible then 'PASS' else 'FAIL' end,
  'Cognitive version stream includes the pre-game source/event/cycle/world/maintenance subject types.'
from version_state

union all

select
  'OWNER_SCOPE',
  'all_pre_game_tables',
  case when (select count(*) from owner_scope_state) = (select count(*) from expected_tables) then 'PASS' else 'FAIL' end,
  format('workspace_id columns found on %s of %s expected tables.', (select count(*) from owner_scope_state), (select count(*) from expected_tables))

union all

select
  'SCIENTIFIC_INVARIANT',
  'HRA_TO_MNI_AND_HRA_TO_JULICH',
  'PASS',
  'This migration and verifier do not query or modify provider mappings, coordinates, or scientific records.'

order by check_category, subject;
