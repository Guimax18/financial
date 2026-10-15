-- ==============================================================================
-- NOSSO CONTROLE — Migration Inicial (Fase 1)
-- Versão Corrigida: Políticas separadas (SELECT/INSERT/UPDATE/DELETE),
-- Prevenção de Recursão RLS, Funções SECURITY DEFINER e Gestão Segura de Convites
-- ==============================================================================

create schema if not exists public;

-- 1. Tabela profiles (Dados de identificação e perfil)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 2. Tabela spaces (Espaços de controle financeiro)
create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users (id) on delete cascade not null,
  name text not null,
  type text check (type in ('personal','family')) not null,
  created_at timestamptz default now() not null
);

-- 3. Tabela space_members (Associação n:m entre usuários e espaços)
create table if not exists public.space_members (
  space_id uuid references public.spaces (id) on delete cascade not null,
  user_id uuid references auth.users (id) on delete cascade not null,
  role text check (role in ('owner','admin','member')) default 'member' not null,
  invited_by uuid references auth.users (id),
  invited_at timestamptz default now() not null,
  primary key (space_id, user_id)
);

-- 4. Tabela space_invitations (Convites seguros por hash)
create table if not exists public.space_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid references public.spaces (id) on delete cascade not null,
  email text not null,
  token_hash text not null unique,
  status text check (status in ('pending','accepted','declined')) default 'pending' not null,
  created_at timestamptz default now() not null,
  expires_at timestamptz not null
);

-- Índices de consulta e desempenho
create index if not exists idx_space_members_user on public.space_members (user_id);
create index if not exists idx_space_members_space on public.space_members (space_id);
create index if not exists idx_invitations_token_hash on public.space_invitations (token_hash);
create index if not exists idx_invitations_email on public.space_invitations (email);

-- ==============================================================================
-- FUNÇÕES DE SEGURANÇA E AUXILIARES (SECURITY DEFINER / search_path seguro)
-- ==============================================================================

-- Função para checar se o usuário autenticado pertence a determinado espaço sem causar recursão
create or replace function public.is_space_member(p_space_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = p_space_id
      and user_id = p_user_id
  );
$$;

-- Função para checar se o usuário autenticado é admin ou owner do espaço
create or replace function public.is_space_manager(p_space_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.space_members
    where space_id = p_space_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$;

-- Função para checar se o usuário autenticado é proprietário daquele espaço
create or replace function public.is_space_owner(p_space_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.spaces
    where id = p_space_id
      and owner_id = p_user_id
  );
$$;

-- ==============================================================================
-- CRIAÇÃO ATÔMICA DE ESPAÇO + VÍNCULO DO PROPRIETÁRIO
-- ==============================================================================
create or replace function public.create_space_with_owner(
  p_name text,
  p_type text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_space_id uuid;
begin
  -- Obtém a identidade garantida pelo JWT autenticado
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Apenas usuários autenticados podem criar espaços.';
  end if;

  if p_type not in ('personal', 'family') then
    raise exception 'Tipo de espaço inválido.';
  end if;

  -- Para espaços pessoais, evita duplicidade caso já possua um
  if p_type = 'personal' and exists (
    select 1 from public.spaces where owner_id = v_user_id and type = 'personal'
  ) then
    raise exception 'O usuário já possui um espaço pessoal configurado.';
  end if;

  -- Cria o espaço atômico utilizando RETURNING id
  insert into public.spaces (owner_id, name, type)
  values (v_user_id, trim(p_name), p_type)
  returning id into v_space_id;

  -- Vincula atomicamente o proprietário na tabela de membros
  insert into public.space_members (space_id, user_id, role, invited_by)
  values (v_space_id, v_user_id, 'owner', v_user_id);

  return v_space_id;
end;
$$;

-- ==============================================================================
-- ACEITE SEGURO DE CONVITES (Valida token_hash, expiração e e-mail autenticado)
-- ==============================================================================
create or replace function public.accept_invitation_secure(
  p_token_hash text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid;
  v_user_email text;
  v_invitation record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Usuário deve estar autenticado para aceitar convite.';
  end if;

  -- Obtém e-mail das claims JWT de forma segura
  v_user_email := nullif(lower(trim(auth.jwt() ->> 'email')), '');
  if v_user_email is null then
    raise exception 'Não foi possível verificar o e-mail autenticado.';
  end if;

  -- Localiza convite pendente e não expirado
  select *
  into v_invitation
  from public.space_invitations
  where token_hash = p_token_hash
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Convite inválido, expirado ou já utilizado.';
  end if;

  -- Valida se o convite corresponde ao usuário logado
  if lower(trim(v_invitation.email)) != v_user_email then
    raise exception 'Este convite foi emitido para outro endereço de e-mail.';
  end if;

  -- Insere o membro no espaço (se já for membro, ignora ou atualiza)
  insert into public.space_members (space_id, user_id, role, invited_at)
  values (v_invitation.space_id, v_user_id, 'member', now())
  on conflict (space_id, user_id) do nothing;

  -- Marca convite como aceito (uso único)
  update public.space_invitations
  set status = 'accepted'
  where id = v_invitation.id;

  return v_invitation.space_id;
end;
$$;

-- Restringe execuções aos usuários autenticados
revoke execute on function public.create_space_with_owner(text, text) from public;
grant execute on function public.create_space_with_owner(text, text) to authenticated;

revoke execute on function public.accept_invitation_secure(text) from public;
grant execute on function public.accept_invitation_secure(text) to authenticated;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) — Políticas Granulares
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.space_invitations enable row level security;

-- ------------------------------------------------------------------------------
-- Políticas para PROFILES
-- ------------------------------------------------------------------------------
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_self" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- Políticas para SPACES
-- ------------------------------------------------------------------------------
-- Leitura: membros do espaço podem ler suas propriedades
create policy "spaces_select_member" on public.spaces
  for select using (public.is_space_member(id, auth.uid()));

-- Inserção: apenas o próprio usuário pode se registrar como owner_id
create policy "spaces_insert_owner" on public.spaces
  for insert with check (auth.uid() = owner_id);

-- Atualização: apenas o proprietário pode alterar o nome/dados do espaço
create policy "spaces_update_owner" on public.spaces
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Exclusão: apenas o proprietário pode apagar o espaço
create policy "spaces_delete_owner" on public.spaces
  for delete using (auth.uid() = owner_id);

-- ------------------------------------------------------------------------------
-- Políticas para SPACE_MEMBERS (Sem recursão infinita via função SECURITY DEFINER)
-- ------------------------------------------------------------------------------
-- Leitura: membros de um mesmo espaço podem ver a lista de participantes
create policy "space_members_select" on public.space_members
  for select using (public.is_space_member(space_id, auth.uid()));

-- Inserção: apenas administradores ou proprietários do espaço podem adicionar membros
create policy "space_members_insert_manager" on public.space_members
  for insert with check (
    public.is_space_manager(space_id, auth.uid()) or auth.uid() = user_id
  );

-- Atualização: membros comuns NÃO podem alterar funções ou se promover
create policy "space_members_update_owner" on public.space_members
  for update using (
    public.is_space_owner(space_id, auth.uid())
  ) with check (
    public.is_space_owner(space_id, auth.uid())
  );

-- Exclusão: proprietário remove membros ou membro se desvincula espontaneamente
create policy "space_members_delete" on public.space_members
  for delete using (
    public.is_space_owner(space_id, auth.uid()) or auth.uid() = user_id
  );

-- ------------------------------------------------------------------------------
-- Políticas para SPACE_INVITATIONS
-- ------------------------------------------------------------------------------
-- Leitura: proprietário e admins do espaço podem visualizar convites gerados
create policy "invitations_select_manager" on public.space_invitations
  for select using (public.is_space_manager(space_id, auth.uid()));

-- Inserção: apenas quem gerencia o espaço pode emitir convites
create policy "invitations_insert_manager" on public.space_invitations
  for insert with check (public.is_space_manager(space_id, auth.uid()));

-- Cancelamento / Exclusão de convite: apenas proprietários e admins
create policy "invitations_delete_manager" on public.space_invitations
  for delete using (public.is_space_manager(space_id, auth.uid()));
