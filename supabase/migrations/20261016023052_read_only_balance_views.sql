-- Supabase grants broad default table/view privileges to API roles.
-- Invoker views still enforce base-table RLS, but should only expose SELECT.
begin;
revoke all on public.account_balances, public.card_balances, public.debt_balances from public, anon, authenticated;
grant select on public.account_balances, public.card_balances, public.debt_balances to authenticated;
commit;
