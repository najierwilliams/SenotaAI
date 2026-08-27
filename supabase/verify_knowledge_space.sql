-- Read-only verification for the Luna Knowledge Space migration.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name like 'luna_knowledge_%'
order by table_name;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename like 'luna_knowledge_%'
order by tablename;
