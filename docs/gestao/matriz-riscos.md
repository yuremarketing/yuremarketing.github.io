# Matriz de Riscos

| ID | Risco | Probabilidade / Impacto | Status |
| :---: | :--- | :---: | :---: |
| R01 | Coleta de dados pessoais (cadastro + histórico de chat do Épico 2) sem base legal/consentimento claro | Média / Alta | Mitigado — mapa de dados, política de privacidade e provedor de LLM (Google Gemini API) aprovados pelo PO no Turno 7; consentimento explícito validado no Artifact do Turno 6 |
| R02 | Área privada do Épico 3 expõe arquivos/orçamentos entre visitantes por falha de controle de acesso | Média / Alta | Mitigado no desenho — Turno 16 (Acordo entre Gemini e Claude): modelo de RLS estrito nas tabelas, isolamento físico por pasta em storage.objects com storage.foldername(name)[1] = auth.uid(), tabela dedicada public.admins + public.is_admin() (SECURITY DEFINER) e revisão das policies de projects. Pendente de implementação e testes de regressão de RLS. |
