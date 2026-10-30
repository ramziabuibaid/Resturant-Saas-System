-- فحص أمني: سياسات كتابة (INSERT/UPDATE/DELETE/ALL) بلا أي شرط.
-- النتيجة المثالية: لا صفوف (No rows returned).
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
  and cmd <> 'SELECT'
  and coalesce(nullif(trim(qual), ''), 'true') = 'true'
  and coalesce(nullif(trim(with_check), ''), 'true') = 'true'
order by tablename, cmd;
