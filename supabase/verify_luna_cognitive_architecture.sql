-- Read-only verification for 20260827_luna_cognitive_architecture.sql
-- Run only after the additive migration in the same Supabase project.
-- Returns two columns: an explicit PASS/FAIL boolean and a human-readable diagnostic.
-- It does not insert, update, delete, or alter any record or schema.

with
expected_tables(table_name) as (
  select unnest(array[
    'luna_cognitive_state', 'luna_memories', 'luna_memory_links', 'luna_projects',
    'luna_goals', 'luna_missions', 'luna_tasks', 'luna_task_dependencies',
    'luna_workers', 'luna_tool_calls', 'luna_attention_items', 'luna_reflections',
    'luna_recovery_records', 'luna_cognitive_versions', 'luna_cognitive_audit_events',
    'luna_maintenance_schedules'
  ]::text[])
),
expected_indexes(index_name) as (
  select unnest(array[
    'luna_memories_retrieval_idx', 'luna_memories_project_idx', 'luna_memory_links_source_idx',
    'luna_projects_workspace_status_idx', 'luna_goals_workspace_status_idx',
    'luna_missions_workspace_status_idx', 'luna_tasks_eligible_idx', 'luna_tasks_mission_idx',
    'luna_workers_mission_state_idx', 'luna_tool_calls_mission_idx', 'luna_attention_open_idx',
    'luna_recovery_open_idx', 'luna_cognitive_audit_idx'
  ]::text[])
),
expected_touch_triggers(trigger_name) as (
  select unnest(array[
    'luna_luna_cognitive_state_touch', 'luna_luna_memories_touch', 'luna_luna_memory_links_touch',
    'luna_luna_projects_touch', 'luna_luna_goals_touch', 'luna_luna_missions_touch',
    'luna_luna_tasks_touch', 'luna_luna_workers_touch', 'luna_luna_maintenance_schedules_touch'
  ]::text[])
),
relations as (
  select c.oid, c.relname, c.relrowsecurity
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
checks as (
  select
    (select count(*) from expected_tables) as expected_table_count,
    (select count(*) from relations r join expected_tables e on e.table_name = r.relname) as found_table_count,
    coalesce((select bool_and(r.relrowsecurity) from relations r join expected_tables e on e.table_name = r.relname), false) as rls_enabled_everywhere,
    (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename in (select table_name from expected_tables) and (p.roles @> array['anon']::name[] or p.roles @> array['authenticated']::name[] or p.roles @> array['public']::name[])) as direct_browser_role_policy_count,
    coalesce((select bool_or(c.conname = 'luna_missions_root_task_id_fkey') from pg_constraint c join relations r on r.oid = c.conrelid where c.contype = 'f' and c.connamespace = 'public'::regnamespace and r.relname in (select table_name from expected_tables)), false) as root_task_fk_exists,
    (select count(*) from pg_indexes i join expected_indexes e on e.index_name = i.indexname where i.schemaname = 'public') as found_index_count,
    (select count(*) from pg_trigger t join relations r on r.oid = t.tgrelid where not t.tgisinternal and t.tgname in (select trigger_name from expected_touch_triggers) and r.relname in (select table_name from expected_tables)) as found_touch_trigger_count,
    (select count(*) from pg_trigger t join relations r on r.oid = t.tgrelid where not t.tgisinternal and t.tgname = 'luna_cognitive_audit_immutable' and r.relname = 'luna_cognitive_audit_events') as immutable_audit_trigger_count,
    exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'luna_prevent_cognitive_audit_mutation' and pg_get_functiondef(p.oid) ilike '%raise exception%') as immutable_audit_function_raises_exception
)
select
  (
    found_table_count = expected_table_count
    and rls_enabled_everywhere
    and direct_browser_role_policy_count = 0
    and root_task_fk_exists
    and found_index_count = 13
    and found_touch_trigger_count = 9
    and immutable_audit_trigger_count = 1
    and immutable_audit_function_raises_exception
  ) as verification_passed,
  format(
    'tables %s/%s; RLS every table=%s; anon/authenticated/public policies=%s; root-task FK=%s; expected indexes found=%s/13; update triggers found=%s/9; immutable audit trigger=%s/1; immutable audit function raises exception=%s',
    found_table_count, expected_table_count, rls_enabled_everywhere, direct_browser_role_policy_count,
    root_task_fk_exists, found_index_count, found_touch_trigger_count, immutable_audit_trigger_count,
    immutable_audit_function_raises_exception
  ) as verification_detail
from checks;

-- Security posture: no direct anon/authenticated/public table policy is created. RLS is enabled on
-- every cognitive table; owner scope is enforced by the server after its dedicated knowledge-owner
-- session is validated. The server's service-role key bypasses RLS and is never sent to the browser.
