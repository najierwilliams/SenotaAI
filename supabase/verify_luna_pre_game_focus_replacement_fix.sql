-- Luna focus-assignment lifecycle correction: READ-ONLY production verification.
-- Run only after 20260828_luna_pre_game_focus_replacement_fix.sql.
-- Contains SELECT statements only; it neither changes data/schema nor invokes runtime work.

select
  'FOCUS_REPLACEMENT_TRIGGER'::text as check_category,
  coalesce(t.tgname, 'luna_focus_assignments_immutable') as subject,
  case
    when t.tgname = 'luna_focus_assignments_immutable'
      and pg_get_triggerdef(t.oid) ilike '%luna_prevent_focus_assignment_history_mutation%'
      and pg_get_functiondef(p.oid) ilike '%old.replaced_at is null%'
      and pg_get_functiondef(p.oid) ilike '%new.replaced_at is not null%'
      and pg_get_functiondef(p.oid) ilike '%to_jsonb(new) - ''replaced_at''%'
    then 'PASS' else 'FAIL'
  end as verdict,
  case when p.oid is null then 'Expected one-way focus-history trigger function was not found.' else 'Only a null-to-timestamp replacement marker may change; all other focus-assignment changes remain rejected.' end as detail
from (select 1) seed
left join pg_trigger t on t.tgrelid = 'public.luna_focus_assignments'::regclass and t.tgname = 'luna_focus_assignments_immutable' and not t.tgisinternal
left join pg_proc p on p.oid = t.tgfoid;

-- Scientific and runtime boundaries remain outside this DDL-only correction.
