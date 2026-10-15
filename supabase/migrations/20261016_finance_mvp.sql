begin;
-- Integer cents; limits also keep JSON numbers within JavaScript safe integers.
create table public.accounts (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 opening_cents bigint not null default 0 check(abs(opening_cents) <= 1000000000000),
 created_at timestamptz not null default now(), unique(space_id,id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100), kind text not null check(kind in ('income','expense')),
 unique(space_id,id), unique(space_id,name,kind)
);
create table public.cards (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 limit_cents bigint not null check(limit_cents between 1 and 1000000000000),
 closing_day integer not null check(closing_day between 1 and 28), due_day integer not null check(due_day between 1 and 28),
 unique(space_id,id)
);
create table public.debts (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 100),
 principal_cents bigint not null check(principal_cents between 1 and 1000000000000),
 due_date date not null, unique(space_id,id)
);
create table public.transactions (
 id uuid primary key default gen_random_uuid(), space_id uuid not null references public.spaces(id) on delete cascade,
 request_key uuid not null, description text not null check(length(trim(description)) between 1 and 200),
 kind text not null check(kind in ('income','expense','transfer','card_payment','debt_payment')),
 amount_cents bigint not null check(amount_cents between 1 and 1000000000000),
 occurred_on date not null, status text not null default 'posted' check(status in ('pending','posted','cancelled')),
 account_id uuid, to_account_id uuid, category_id uuid, card_id uuid, debt_id uuid,
 created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now(),
 unique(space_id,request_key),
 foreign key(space_id,account_id) references public.accounts(space_id,id),
 foreign key(space_id,to_account_id) references public.accounts(space_id,id),
 foreign key(space_id,category_id) references public.categories(space_id,id),
 foreign key(space_id,card_id) references public.cards(space_id,id),
 foreign key(space_id,debt_id) references public.debts(space_id,id),
 check (
  (kind='income' and account_id is not null and to_account_id is null and card_id is null and debt_id is null) or
  (kind='expense' and ((account_id is not null and card_id is null) or (account_id is null and card_id is not null)) and to_account_id is null and debt_id is null) or
  (kind='transfer' and account_id is not null and to_account_id is not null and account_id <> to_account_id and card_id is null and debt_id is null and category_id is null) or
  (kind='card_payment' and account_id is not null and card_id is not null and to_account_id is null and debt_id is null and category_id is null) or
  (kind='debt_payment' and account_id is not null and debt_id is not null and to_account_id is null and card_id is null and category_id is null)
 )
);
create index transactions_space_date on public.transactions(space_id,occurred_on desc,id);
create index transactions_account on public.transactions(space_id,account_id);
create index transactions_destination on public.transactions(space_id,to_account_id);
create index transactions_card on public.transactions(space_id,card_id);
create index transactions_debt on public.transactions(space_id,debt_id);
create index accounts_space on public.accounts(space_id);

create function public.validate_transaction() returns trigger language plpgsql set search_path = '' as $$
declare v_principal bigint; v_paid numeric;
begin
 if new.category_id is not null and not exists(select 1 from public.categories where id=new.category_id and space_id=new.space_id and kind=new.kind) then
  raise exception 'Categoria incompatível' using errcode='23514';
 end if;
 if new.status='posted' and new.occurred_on > current_date then
  raise exception 'Lançamento futuro deve ficar previsto' using errcode='23514';
 end if;
 if new.kind='debt_payment' and new.status='posted' then
  -- Serialize repayments on the debt, including concurrent inserts.
  select principal_cents into v_principal from public.debts where id=new.debt_id and space_id=new.space_id for update;
  select coalesce(sum(amount_cents),0) into v_paid from public.transactions
   where debt_id=new.debt_id and space_id=new.space_id and status='posted' and id<>new.id;
  if v_paid + new.amount_cents > v_principal then
   raise exception 'Pagamento excede saldo da dívida' using errcode='23514';
  end if;
 end if;
 return new;
end;
$$;
create trigger validate_transaction before insert or update on public.transactions for each row execute function public.validate_transaction();

do $$declare t text; begin
 foreach t in array array['accounts','categories','cards','debts','transactions'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select, insert on public.%I to authenticated',t);
  execute format('create policy member_select on public.%I for select to authenticated using(public.is_space_member(space_id,auth.uid()))',t);
  execute format('create policy member_insert on public.%I for insert to authenticated with check(public.is_space_member(space_id,auth.uid()))',t);
 end loop;
end$$;
-- Actor attribution is enforced by RLS rather than accepting arbitrary client IDs.
create policy actor_insert on public.transactions as restrictive for insert to authenticated with check(created_by=auth.uid());
grant update(status) on public.transactions to authenticated;
create policy member_update on public.transactions for update to authenticated using(public.is_space_member(space_id,auth.uid())) with check(public.is_space_member(space_id,auth.uid()));
grant update(name) on public.accounts, public.categories, public.cards, public.debts to authenticated;
create policy member_update on public.accounts for update to authenticated using(public.is_space_member(space_id,auth.uid())) with check(public.is_space_member(space_id,auth.uid()));
create policy member_update on public.categories for update to authenticated using(public.is_space_member(space_id,auth.uid())) with check(public.is_space_member(space_id,auth.uid()));
create policy member_update on public.cards for update to authenticated using(public.is_space_member(space_id,auth.uid())) with check(public.is_space_member(space_id,auth.uid()));
create policy member_update on public.debts for update to authenticated using(public.is_space_member(space_id,auth.uid())) with check(public.is_space_member(space_id,auth.uid()));

-- Invoker views retain base table RLS. Never maintain a mutable client-side balance.
create view public.account_balances with(security_invoker=true) as
select a.*, a.opening_cents + coalesce((select sum(case when t.kind='income' or t.to_account_id=a.id then t.amount_cents else -t.amount_cents end)
 from public.transactions t where t.space_id=a.space_id and t.status='posted' and (t.account_id=a.id or t.to_account_id=a.id)),0) as balance_cents
from public.accounts a;
create view public.card_balances with(security_invoker=true) as
select c.*, coalesce((select sum(case when t.kind='expense' then t.amount_cents else -t.amount_cents end)
 from public.transactions t where t.space_id=c.space_id and t.card_id=c.id and t.status='posted'),0) as owed_cents from public.cards c;
create view public.debt_balances with(security_invoker=true) as
select d.*, d.principal_cents-coalesce((select sum(t.amount_cents) from public.transactions t where t.space_id=d.space_id and t.debt_id=d.id and t.status='posted'),0) as remaining_cents from public.debts d;
grant select on public.account_balances, public.card_balances, public.debt_balances to authenticated;
revoke all on function public.validate_transaction() from public, anon, authenticated;
create function public.finance_summary(p_space_id uuid, p_as_of date)
returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'balance_cents',coalesce((select sum(balance_cents) from public.account_balances where space_id=p_space_id),0),
  'income_cents',coalesce(sum(amount_cents) filter(where status='posted' and kind='income' and occurred_on between date_trunc('month',p_as_of)::date and p_as_of),0),
  'expense_cents',coalesce(sum(amount_cents) filter(where status='posted' and kind in ('expense','debt_payment') and occurred_on between date_trunc('month',p_as_of)::date and p_as_of),0),
  'pending_cash_cents',coalesce(sum(case when kind='income' then amount_cents when kind in ('expense','card_payment','debt_payment') and account_id is not null then -amount_cents else 0 end) filter(where status='pending' and occurred_on<=p_as_of+30),0)
 ) from public.transactions where space_id=p_space_id;
$$;
revoke all on function public.finance_summary(uuid,date) from public,anon;
grant execute on function public.finance_summary(uuid,date) to authenticated;
commit;
