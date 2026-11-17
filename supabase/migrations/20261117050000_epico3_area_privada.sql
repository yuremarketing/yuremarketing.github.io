-- Épico 3 — Área Privada Cliente/Visitante (issue #12).
-- Mitiga o risco R02 (docs/gestao/matriz-riscos.md): introduz public.is_admin()
-- para parar de tratar "autenticado" como sinônimo de "admin", e isola cada
-- cliente por auth.uid() nas tabelas novas e no bucket de storage.

create extension if not exists pgcrypto;

-- 1. Admins -----------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admins_read_self"
  on public.admins
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;

-- 2. Revisão das policies de projects (eram "authenticated = admin") --------

drop policy if exists "projects_authenticated_read" on public.projects;
drop policy if exists "projects_authenticated_write" on public.projects;

create policy "projects_admin_read"
  on public.projects
  for select
  to authenticated
  using (public.is_admin());

create policy "projects_admin_write"
  on public.projects
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. Tabelas do Épico 3 ------------------------------------------------------

create table if not exists public.client_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  budget_estimate numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.client_requests(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.client_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.client_requests(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.client_requests enable row level security;
alter table public.client_messages enable row level security;
alter table public.client_attachments enable row level security;

create policy "client_requests_select"
  on public.client_requests
  for select
  to authenticated
  using (public.is_admin() or user_id = auth.uid());

create policy "client_requests_insert"
  on public.client_requests
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "client_requests_update"
  on public.client_requests
  for update
  to authenticated
  using (public.is_admin() or user_id = auth.uid())
  with check (public.is_admin() or user_id = auth.uid());

create policy "client_requests_delete"
  on public.client_requests
  for delete
  to authenticated
  using (public.is_admin() or user_id = auth.uid());

create policy "client_messages_select"
  on public.client_messages
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.client_requests r
      where r.id = request_id and r.user_id = auth.uid()
    )
  );

create policy "client_messages_insert"
  on public.client_messages
  for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.client_requests r
        where r.id = request_id and r.user_id = auth.uid()
      )
    )
  );

create policy "client_attachments_select"
  on public.client_attachments
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.client_requests r
      where r.id = request_id and r.user_id = auth.uid()
    )
  );

create policy "client_attachments_insert"
  on public.client_attachments
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and (
      public.is_admin()
      or exists (
        select 1 from public.client_requests r
        where r.id = request_id and r.user_id = auth.uid()
      )
    )
  );

create policy "client_attachments_delete"
  on public.client_attachments
  for delete
  to authenticated
  using (public.is_admin() or uploaded_by = auth.uid());

-- 4. Storage: bucket privado client-assets -----------------------------------
-- Convenção de path: client-assets/{user_id}/{request_id}/{filename}

insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', false)
on conflict (id) do nothing;

create policy "client_assets_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-assets' and
    (
      public.is_admin() or
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "client_assets_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-assets' and
    (
      public.is_admin() or
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

create policy "client_assets_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'client-assets' and
    (
      public.is_admin() or
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 5. Passo manual pós-deploy (não executar aqui: evita hardcodar UID/PII) ----
-- Promover o Yure a admin, depois que esta migration estiver live:
--   insert into public.admins (user_id)
--   select id from auth.users where email = '<email do Yure>'
--   on conflict do nothing;
