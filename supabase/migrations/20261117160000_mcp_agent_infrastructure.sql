-- Migração: Infraestrutura para Servidor MCP e Agentes AgLoop (Issue #20)
-- Cria tabelas de credenciamento (agent_tokens) e auditoria de escrita (agent_audit_log).

create extension if not exists pgcrypto;

-- 1. Tabela de Tokens de Agente ----------------------------------------------
create table if not exists public.agent_tokens (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  token_hash text not null unique,
  scopes text[] not null default '{}',
  description text,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_agent_tokens_hash on public.agent_tokens(token_hash);
create index if not exists idx_agent_tokens_agent_name on public.agent_tokens(agent_name);

alter table public.agent_tokens enable row level security;

-- Políticas de RLS para agent_tokens:
-- Apenas administradores autenticados podem visualizar e gerenciar tokens.
-- Clientes anônimos ou visitantes comuns não possuem acesso.
create policy "admin_read_agent_tokens"
  on public.agent_tokens
  for select
  to authenticated
  using (public.is_admin());

create policy "admin_manage_agent_tokens"
  on public.agent_tokens
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Tabela de Auditoria de Operações dos Agentes -----------------------------
create table if not exists public.agent_audit_log (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  token_id uuid references public.agent_tokens(id) on delete set null,
  tool text not null,
  args jsonb default '{}'::jsonb,
  result jsonb default '{}'::jsonb,
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_audit_log_created_at on public.agent_audit_log(created_at desc);
create index if not exists idx_agent_audit_log_agent on public.agent_audit_log(agent_name);
create index if not exists idx_agent_audit_log_tool on public.agent_audit_log(tool);

alter table public.agent_audit_log enable row level security;

-- Apenas administradores podem ler os logs de auditoria dos agentes.
create policy "admin_read_agent_audit_log"
  on public.agent_audit_log
  for select
  to authenticated
  using (public.is_admin());

-- 3. Função Auxiliar para Geração de Tokens de Agente (Apenas Admin) ----------
create or replace function public.create_agent_token(
  p_agent_name text,
  p_scopes text[],
  p_description text default null,
  p_expires_days integer default 90
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_raw_token text;
  v_token_hash text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem gerar tokens de agente.';
  end if;

  -- Gera token seguro prefixado 'mcp_agloop_'
  v_raw_token := 'mcp_agloop_' || encode(gen_random_bytes(24), 'hex');
  v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

  insert into public.agent_tokens (
    agent_name,
    token_hash,
    scopes,
    description,
    expires_at
  ) values (
    p_agent_name,
    v_token_hash,
    p_scopes,
    p_description,
    case when p_expires_days is not null then now() + (p_expires_days || ' days')::interval else null end
  );

  -- Retorna o token em texto puro uma única vez para cópia segura
  return v_raw_token;
end;
$$;

revoke execute on function public.create_agent_token(text, text[], text, integer) from public;
grant execute on function public.create_agent_token(text, text[], text, integer) to authenticated;
