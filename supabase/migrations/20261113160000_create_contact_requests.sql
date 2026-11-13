-- Tabela mínima pra viabilizar um retorno quando o visitante do assistente de
-- IA pedir contato. Não guarda o histórico do chat (ver politica-privacidade.md
-- e mapa-dados-pessoais.md) -- só o necessário pro Yure responder fora do chat.

create extension if not exists pgcrypto;

create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

-- Visitantes (anônimos ou autenticados) podem registrar um pedido de contato,
-- mas nunca ler, listar, atualizar ou apagar pedidos -- só o Yure, via
-- Supabase Studio/service role, acessa isso.
create policy "contact_requests_insert_only"
  on public.contact_requests
  for insert
  to anon, authenticated
  with check (true);
