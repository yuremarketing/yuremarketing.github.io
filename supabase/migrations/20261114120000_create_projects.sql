-- Tabela de projetos da vitrine (Admin.jsx gerencia; Dashboard.jsx exibe
-- publicamente só os projetos com visible = true). Schema espelha exatamente
-- o payload já usado em src/pages/Admin.jsx e src/pages/Dashboard.jsx.

create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text,
  github_url text,
  tags text[] not null default '{}',
  image_url text,
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- Visitantes anônimos só veem projetos marcados como visíveis.
create policy "projects_public_read"
  on public.projects
  for select
  to anon
  using (visible = true);

-- O admin autenticado (painel /admin) vê e gerencia todos os projetos,
-- inclusive os ocultos.
create policy "projects_authenticated_read"
  on public.projects
  for select
  to authenticated
  using (true);

create policy "projects_authenticated_write"
  on public.projects
  for all
  to authenticated
  using (true)
  with check (true);
