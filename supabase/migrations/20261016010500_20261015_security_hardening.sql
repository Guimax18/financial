-- Apply together with 20261014_init_security.sql before exposing the API.
-- Additive repair for installations of the old version; initial SQL is also hardened.
begin;

create unique index spaces_one_personal_per_owner on public.spaces(owner_id) where type = 'personal';
alter table public.spaces add constraint spaces_name_valid check (length(trim(name)) between 1 and 100);
alter table public.space_invitations add constraint invitations_hash_valid check (token_hash ~ '^[0-9a-f]{64}$');
alter table public.space_invitations add constraint invitations_lifetime check (expires_at > created_at and expires_at <= created_at + interval '48 hours');
alter table public.space_invitations alter column expires_at set default (now() + interval '48 hours');

-- Creation and joining must use the atomic RPCs. Direct grants cannot bypass this.
drop policy spaces_insert_owner on public.spaces;
drop policy space_members_insert_manager on public.space_members;
drop policy space_members_update_owner on public.space_members;
drop policy space_members_delete on public.space_members;
create policy space_members_delete on public.space_members for delete to authenticated
using (role <> 'owner' and (public.is_space_owner(space_id, auth.uid()) or user_id = auth.uid()));

-- Only names may change. Ownership/type/primary keys are immutable via the API.
revoke all on public.spaces, public.space_members, public.space_invitations, public.profiles from anon, authenticated;
grant select, delete on public.spaces to authenticated;
grant update(name) on public.spaces to authenticated;
grant select, delete on public.space_members to authenticated;
grant select, insert, delete on public.space_invitations to authenticated;
grant select, insert on public.profiles to authenticated;
grant update(full_name, avatar_url) on public.profiles to authenticated;

create or replace function public.is_space_member(p_space_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
 select p_user_id = auth.uid() and exists(select 1 from public.space_members where space_id = p_space_id and user_id = auth.uid());
$$;
create or replace function public.is_space_manager(p_space_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
 select p_user_id = auth.uid() and exists(select 1 from public.space_members where space_id = p_space_id and user_id = auth.uid() and role in ('owner','admin'));
$$;
create or replace function public.is_space_owner(p_space_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
 select p_user_id = auth.uid() and exists(select 1 from public.spaces where id = p_space_id and owner_id = auth.uid());
$$;
revoke all on function public.is_space_member(uuid,uuid), public.is_space_manager(uuid,uuid), public.is_space_owner(uuid,uuid) from public, anon;
grant execute on function public.is_space_member(uuid,uuid), public.is_space_manager(uuid,uuid), public.is_space_owner(uuid,uuid) to authenticated;

drop policy invitations_insert_manager on public.space_invitations;
create policy invitations_insert_manager on public.space_invitations for insert to authenticated
with check (public.is_space_manager(space_id,auth.uid()) and status = 'pending'
 and exists(select 1 from public.spaces where id = space_id and type = 'family')
 and created_at >= now() - interval '1 minute' and created_at <= now()
 and expires_at > now() and expires_at <= now() + interval '48 hours'
 and email = lower(trim(email)) and length(email) between 3 and 254 and position('@' in email) > 1);

create or replace function public.create_space_with_owner(p_name text, p_type text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_space uuid;
begin
 if v_user is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
 if p_type is null or p_type not in ('personal','family') or p_name is null or length(trim(p_name)) not between 1 and 100 then
  raise exception 'Nome ou tipo inválido' using errcode = '22023';
 end if;
 insert into public.spaces(owner_id,name,type) values(v_user,trim(p_name),p_type) returning id into v_space;
 insert into public.space_members(space_id,user_id,role,invited_by) values(v_space,v_user,'owner',v_user);
 return v_space;
end;
$$;

create or replace function public.accept_invitation_secure(p_token_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_email text; v_inv public.space_invitations;
begin
 if v_user is null then raise exception 'Autenticação necessária' using errcode = '42501'; end if;
 -- Current confirmed identity from Auth, never user_metadata or stale email claims.
 select lower(trim(email)) into v_email from auth.users where id = v_user and email_confirmed_at is not null;
 if v_email is null then raise exception 'Confirme seu e-mail antes de aceitar' using errcode = '42501'; end if;
 select i.* into v_inv from public.space_invitations i join public.spaces s on s.id = i.space_id
 where i.token_hash = p_token_hash and i.status = 'pending' and i.expires_at > now() and s.type = 'family'
 for update of i;
 if not found or v_inv.email <> v_email then raise exception 'Convite inválido, expirado ou de outro e-mail' using errcode = '42501'; end if;
 insert into public.space_members(space_id,user_id,role) values(v_inv.space_id,v_user,'member') on conflict do nothing;
 update public.space_invitations set status = 'accepted' where id = v_inv.id;
 return v_inv.space_id;
end;
$$;
revoke all on function public.create_space_with_owner(text,text), public.accept_invitation_secure(text) from public, anon;
grant execute on function public.create_space_with_owner(text,text), public.accept_invitation_secure(text) to authenticated;
commit;
