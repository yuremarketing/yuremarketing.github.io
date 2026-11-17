-- Hardening pós-deploy (Issue #20 / Turno 22): o advisor de segurança do Supabase
-- apontou que o role 'anon' mantinha EXECUTE em create_agent_token via grant
-- individual preexistente (não coberto pelo "revoke ... from public" da migration
-- original). A checagem interna is_admin() já bloqueava isso na prática (confirmado
-- empiricamente via curl contra o endpoint real), mas o grant deve refletir o
-- least-privilege pretendido.
revoke execute on function public.create_agent_token(text, text[], text, integer) from anon;
