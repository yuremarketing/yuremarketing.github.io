-- Hardening pós-auditoria do Portal do Cliente (issue #26).
-- public.is_admin() é SECURITY DEFINER e, por padrão do Postgres, ganhou
-- EXECUTE para PUBLIC ao ser criada (20261117050000_epico3_area_privada.sql).
-- Isso permite que qualquer visitante não autenticado (role anon) chame
-- /rest/v1/rpc/is_admin diretamente. Não expõe dado sensível (para anon,
-- auth.uid() é nulo e a função sempre retorna false), mas é superfície
-- desnecessária apontada pelo linter de segurança do Supabase
-- (anon_security_definer_function_executable).
--
-- Mantemos EXECUTE para `authenticated`: as policies de RLS de
-- client_requests, client_messages, client_attachments e projects chamam
-- is_admin() durante a avaliação da policy, e isso exige que a role da
-- sessão (authenticated, via PostgREST) tenha EXECUTE na função — revogar
-- dela quebraria todo o acesso dessas tabelas.

revoke execute on function public.is_admin() from public;
-- `anon` carregava um GRANT explícito independente de PUBLIC (confirmado via
-- information_schema.routine_privileges em produção) — revogar de PUBLIC não
-- bastou, foi preciso revogar da role nominalmente.
revoke execute on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated;
