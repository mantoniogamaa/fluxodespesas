-- Fluxo v11 + Supabase (homologação / teste)
-- Atenção: este modelo salva o estado do app em JSONB.
-- Isso acelera o teste, mas NÃO é o desenho ideal para produção multiusuário.

create extension if not exists pgcrypto;

create table if not exists public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null check (role in ('gestor', 'colaborador')),
  nome text not null,
  workspace_id text not null default 'principal',
  colaborador_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_state (
  workspace_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_drafts (
  workspace_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.app_profiles enable row level security;
alter table public.workspace_state enable row level security;
alter table public.workspace_drafts enable row level security;

create policy if not exists "profile_self_select"
  on public.app_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy if not exists "profile_self_update"
  on public.app_profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy if not exists "profile_self_insert"
  on public.app_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy if not exists "workspace_members_select_state"
  on public.workspace_state
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.app_profiles p
      where p.id = (select auth.uid())
        and p.workspace_id = workspace_state.workspace_id
    )
  );

create policy if not exists "workspace_members_insert_state"
  on public.workspace_state
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.app_profiles p
      where p.id = (select auth.uid())
        and p.workspace_id = workspace_state.workspace_id
    )
  );

create policy if not exists "workspace_members_update_state"
  on public.workspace_state
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.app_profiles p
      where p.id = (select auth.uid())
        and p.workspace_id = workspace_state.workspace_id
    )
  )
  with check (
    exists (
      select 1
      from public.app_profiles p
      where p.id = (select auth.uid())
        and p.workspace_id = workspace_state.workspace_id
    )
  );

create policy if not exists "user_select_own_draft"
  on public.workspace_drafts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy if not exists "user_insert_own_draft"
  on public.workspace_drafts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy if not exists "user_update_own_draft"
  on public.workspace_drafts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy if not exists "user_delete_own_draft"
  on public.workspace_drafts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
