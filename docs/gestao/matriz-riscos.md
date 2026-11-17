# Matriz de Riscos

| ID | Risco | Probabilidade / Impacto | Status |
| :---: | :--- | :---: | :---: |
| R01 | Coleta de dados pessoais (cadastro + histórico de chat do Épico 2) sem base legal/consentimento claro | Média / Alta | Mitigado — mapa de dados, política de privacidade e provedor de LLM (Google Gemini API) aprovados pelo PO no Turno 7; consentimento explícito validado no Artifact do Turno 6 |
| R02 | Área privada do Épico 3 expõe arquivos/orçamentos entre visitantes por falha de controle de acesso | Média / Alta | Mitigado — Turno 17: migration aplicada no Supabase, RLS ativo em client_requests/messages/attachments, bucket privado client-assets com isolamento por auth.uid() e tabela public.admins configurada. |
