-- Fix R02: Restringe update em client_requests estritamente a administradores (public.is_admin())
-- Impede que clientes autoaprovem orçamentos ou alterem status diretamente via API.

drop policy if exists "client_requests_update" on public.client_requests;

create policy "client_requests_update"
  on public.client_requests
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
