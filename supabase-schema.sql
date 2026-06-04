-- ============================================================
-- Fluxo — Schema relacional v12
-- Execute completo no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================
create extension if not exists pgcrypto;

-- ============================================================
-- FUNÇÃO AUXILIAR: retorna empresa_id do usuário logado
-- (usada nas políticas RLS de todas as tabelas)
-- ============================================================
create or replace function public.get_empresa_id()
returns text
language sql
security definer
stable
as $$
  select empresa_id from public.usuarios where id = auth.uid() limit 1;
$$;

-- ============================================================
-- TABELA: usuarios
-- Perfis de acesso vinculados ao Supabase Auth
-- ============================================================
create table if not exists public.usuarios (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique not null,
  role          text not null check (role in ('gestor', 'gerente', 'colaborador')),
  nome          text not null,
  empresa_id    text not null default 'principal',
  colaborador_id bigint,
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================
-- TABELA: departamentos
-- ============================================================
create table if not exists public.departamentos (
  id          bigserial primary key,
  empresa_id  text not null default 'principal',
  nome        text not null,
  descricao   text,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABELA: centros_custo
-- ============================================================
create table if not exists public.centros_custo (
  id               bigserial primary key,
  empresa_id       text not null default 'principal',
  codigo           text not null,
  nome             text not null,
  departamento_id  bigint references public.departamentos(id) on delete set null,
  ativo            boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- TABELA: politicas
-- ============================================================
create table if not exists public.politicas (
  id          bigserial primary key,
  empresa_id  text not null default 'principal',
  nome        text not null,
  descricao   text,
  limites     jsonb not null default '{}'::jsonb,
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- TABELA: colaboradores
-- ============================================================
create table if not exists public.colaboradores (
  id               bigserial primary key,
  empresa_id       text not null default 'principal',
  nome             text not null,
  email            text,
  telefone         text,
  cpf              text,
  cargo            text,
  departamento_id  bigint references public.departamentos(id) on delete set null,
  centro_custo_id  bigint references public.centros_custo(id) on delete set null,
  politica_id      bigint references public.politicas(id) on delete set null,
  chave_pix        text,
  avatar_color     text default '#4F7CFF',
  status           text not null default 'ativo' check (status in ('ativo', 'inativo')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- TABELA: fluxos (verbas / créditos)
-- ============================================================
create table if not exists public.fluxos (
  id              bigserial primary key,
  empresa_id      text not null default 'principal',
  colaborador_id  bigint references public.colaboradores(id) on delete cascade,
  motivo          text not null,
  total           numeric(12,2) not null default 0,
  usado           numeric(12,2) not null default 0,
  status          text not null default 'ativa',
  data_inicio     date,
  data_fim        date,
  criado_por      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- TABELA: despesas
-- ============================================================
create table if not exists public.despesas (
  id                bigserial primary key,
  empresa_id        text not null default 'principal',
  fluxo_id          bigint references public.fluxos(id) on delete set null,
  colaborador_id    bigint references public.colaboradores(id) on delete cascade,
  estabelecimento   text not null,
  categoria         text not null,
  valor             numeric(12,2) not null,
  data_despesa      date not null,
  horario           text,
  observacao        text,
  foto_url          text,
  justificativa     text,
  status            text not null default 'Pendente',
  aprovado_por      uuid references auth.users(id) on delete set null,
  aprovado_em       timestamptz,
  motivo_rejeicao   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ============================================================
-- TABELA: log_acoes
-- ============================================================
create table if not exists public.log_acoes (
  id          bigserial primary key,
  empresa_id  text not null default 'principal',
  usuario_id  uuid references auth.users(id) on delete set null,
  tipo        text,
  texto       text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TABELA: rascunhos (prestação em andamento)
-- ============================================================
create table if not exists public.rascunhos (
  empresa_id  text not null default 'principal',
  usuario_id  uuid not null references auth.users(id) on delete cascade,
  itens       jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (empresa_id, usuario_id)
);

-- ============================================================
-- RLS — habilitar em todas as tabelas
-- ============================================================
alter table public.usuarios       enable row level security;
alter table public.departamentos  enable row level security;
alter table public.centros_custo  enable row level security;
alter table public.politicas      enable row level security;
alter table public.colaboradores  enable row level security;
alter table public.fluxos         enable row level security;
alter table public.despesas       enable row level security;
alter table public.log_acoes      enable row level security;
alter table public.rascunhos      enable row level security;

-- ============================================================
-- POLÍTICAS RLS — usuarios
-- ============================================================
drop policy if exists "usuarios_select" on public.usuarios;
create policy "usuarios_select"
  on public.usuarios for select
  to authenticated
  using (
    id = auth.uid()
    or empresa_id = public.get_empresa_id()
  );

drop policy if exists "usuarios_update" on public.usuarios;
create policy "usuarios_update"
  on public.usuarios for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- MACRO para criar políticas RLS nas demais tabelas
-- (select, insert, update, delete filtrados por empresa_id)
-- ============================================================

-- departamentos
drop policy if exists "depto_select" on public.departamentos;
create policy "depto_select" on public.departamentos for select to authenticated
  using (empresa_id = public.get_empresa_id());
drop policy if exists "depto_insert" on public.departamentos;
create policy "depto_insert" on public.departamentos for insert to authenticated
  with check (empresa_id = public.get_empresa_id());
drop policy if exists "depto_update" on public.departamentos;
create policy "depto_update" on public.departamentos for update to authenticated
  using (empresa_id = public.get_empresa_id()) with check (empresa_id = public.get_empresa_id());
drop policy if exists "depto_delete" on public.departamentos;
create policy "depto_delete" on public.departamentos for delete to authenticated
  using (empresa_id = public.get_empresa_id());

-- centros_custo
drop policy if exists "cc_select" on public.centros_custo;
create policy "cc_select" on public.centros_custo for select to authenticated
  using (empresa_id = public.get_empresa_id());
drop policy if exists "cc_insert" on public.centros_custo;
create policy "cc_insert" on public.centros_custo for insert to authenticated
  with check (empresa_id = public.get_empresa_id());
drop policy if exists "cc_update" on public.centros_custo;
create policy "cc_update" on public.centros_custo for update to authenticated
  using (empresa_id = public.get_empresa_id()) with check (empresa_id = public.get_empresa_id());
drop policy if exists "cc_delete" on public.centros_custo;
create policy "cc_delete" on public.centros_custo for delete to authenticated
  using (empresa_id = public.get_empresa_id());

-- politicas
drop policy if exists "pol_select" on public.politicas;
create policy "pol_select" on public.politicas for select to authenticated
  using (empresa_id = public.get_empresa_id());
drop policy if exists "pol_insert" on public.politicas;
create policy "pol_insert" on public.politicas for insert to authenticated
  with check (empresa_id = public.get_empresa_id());
drop policy if exists "pol_update" on public.politicas;
create policy "pol_update" on public.politicas for update to authenticated
  using (empresa_id = public.get_empresa_id()) with check (empresa_id = public.get_empresa_id());
drop policy if exists "pol_delete" on public.politicas;
create policy "pol_delete" on public.politicas for delete to authenticated
  using (empresa_id = public.get_empresa_id());

-- colaboradores
drop policy if exists "colab_select" on public.colaboradores;
create policy "colab_select" on public.colaboradores for select to authenticated
  using (empresa_id = public.get_empresa_id());
drop policy if exists "colab_insert" on public.colaboradores;
create policy "colab_insert" on public.colaboradores for insert to authenticated
  with check (empresa_id = public.get_empresa_id());
drop policy if exists "colab_update" on public.colaboradores;
create policy "colab_update" on public.colaboradores for update to authenticated
  using (empresa_id = public.get_empresa_id()) with check (empresa_id = public.get_empresa_id());
drop policy if exists "colab_delete" on public.colaboradores;
create policy "colab_delete" on public.colaboradores for delete to authenticated
  using (empresa_id = public.get_empresa_id());

-- fluxos
drop policy if exists "fluxos_select" on public.fluxos;
create policy "fluxos_select" on public.fluxos for select to authenticated
  using (empresa_id = public.get_empresa_id());
drop policy if exists "fluxos_insert" on public.fluxos;
create policy "fluxos_insert" on public.fluxos for insert to authenticated
  with check (empresa_id = public.get_empresa_id());
drop policy if exists "fluxos_update" on public.fluxos;
create policy "fluxos_update" on public.fluxos for update to authenticated
  using (empresa_id = public.get_empresa_id()) with check (empresa_id = public.get_empresa_id());
drop policy if exists "fluxos_delete" on public.fluxos;
create policy "fluxos_delete" on public.fluxos for delete to authenticated
  using (empresa_id = public.get_empresa_id());

-- despesas
drop policy if exists "desp_select" on public.despesas;
create policy "desp_select" on public.despesas for select to authenticated
  using (empresa_id = public.get_empresa_id());
drop policy if exists "desp_insert" on public.despesas;
create policy "desp_insert" on public.despesas for insert to authenticated
  with check (empresa_id = public.get_empresa_id());
drop policy if exists "desp_update" on public.despesas;
create policy "desp_update" on public.despesas for update to authenticated
  using (empresa_id = public.get_empresa_id()) with check (empresa_id = public.get_empresa_id());
drop policy if exists "desp_delete" on public.despesas;
create policy "desp_delete" on public.despesas for delete to authenticated
  using (empresa_id = public.get_empresa_id());

-- log_acoes
drop policy if exists "log_select" on public.log_acoes;
create policy "log_select" on public.log_acoes for select to authenticated
  using (empresa_id = public.get_empresa_id());
drop policy if exists "log_insert" on public.log_acoes;
create policy "log_insert" on public.log_acoes for insert to authenticated
  with check (empresa_id = public.get_empresa_id());

-- rascunhos
drop policy if exists "rascunho_select" on public.rascunhos;
create policy "rascunho_select" on public.rascunhos for select to authenticated
  using (usuario_id = auth.uid());
drop policy if exists "rascunho_insert" on public.rascunhos;
create policy "rascunho_insert" on public.rascunhos for insert to authenticated
  with check (usuario_id = auth.uid());
drop policy if exists "rascunho_update" on public.rascunhos;
create policy "rascunho_update" on public.rascunhos for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
drop policy if exists "rascunho_delete" on public.rascunhos;
create policy "rascunho_delete" on public.rascunhos for delete to authenticated
  using (usuario_id = auth.uid());

-- ============================================================
-- FUNÇÃO: criar_gestor_inicial
-- Use após criar o usuário em Authentication → Users:
--   select public.criar_gestor_inicial('UUID', 'email', 'Nome', 'principal');
-- ============================================================
create or replace function public.criar_gestor_inicial(
  p_user_id   uuid,
  p_email     text,
  p_nome      text,
  p_empresa_id text default 'principal'
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.usuarios (id, email, nome, role, empresa_id, ativo)
  values (p_user_id, p_email, p_nome, 'gestor', p_empresa_id, true)
  on conflict (id) do update set
    email      = excluded.email,
    nome       = excluded.nome,
    role       = excluded.role,
    empresa_id = excluded.empresa_id,
    ativo      = excluded.ativo,
    updated_at = now();
end;
$$;
