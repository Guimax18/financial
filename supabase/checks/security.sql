-- Read-only checks; run as the database administrator, not as an API role.
select 'rls_9_tables' as check_name, count(*)=9 and bool_and(c.relrowsecurity) as passed
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('profiles','spaces','space_members','space_invitations','accounts','categories','cards','debts','transactions')
union all select 'anonymous_no_select', not bool_or(has_table_privilege('anon','public.'||t,'select'))
from unnest(array['profiles','spaces','space_members','space_invitations','accounts','categories','cards','debts','transactions']) t
union all select 'membership_no_direct_writes', not has_table_privilege('authenticated','public.space_members','insert') and not has_table_privilege('authenticated','public.space_members','update')
union all select 'spaces_no_direct_insert', not has_table_privilege('authenticated','public.spaces','insert')
union all select 'spaces_owner_type_immutable', not has_column_privilege('authenticated','public.spaces','owner_id','update') and not has_column_privilege('authenticated','public.spaces','type','update')
union all select 'views_invoker_3', count(*)=3 and bool_and('security_invoker=true'=any(c.reloptions))
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('account_balances','card_balances','debt_balances')
union all select 'unique_personal_index', exists(select 1 from pg_indexes where schemaname='public' and indexname='spaces_one_personal_per_owner')
union all select 'confirmed_email_guard', position('email_confirmed_at' in pg_get_functiondef('public.accept_invitation_secure(text)'::regprocedure))>0
union all select 'financial_5_composite_fks', count(*)=5 from pg_constraint where conrelid='public.transactions'::regclass and contype='f' and array_length(conkey,1)=2
union all select 'debt_payment_row_lock', position('for update' in lower(pg_get_functiondef('public.validate_transaction()'::regprocedure)))>0
union all select 'summary_security_invoker', not prosecdef from pg_proc where oid='public.finance_summary(uuid,date)'::regprocedure
union all select 'invitation_expiry_default', column_default is not null from information_schema.columns where table_schema='public' and table_name='space_invitations' and column_name='expires_at'
union all select 'balance_views_read_only', count(*)=3 and bool_and(privilege_type='SELECT' and grantee='authenticated')
from information_schema.table_privileges where table_schema='public' and table_name in ('account_balances','card_balances','debt_balances') and grantee in ('anon','authenticated','PUBLIC');
