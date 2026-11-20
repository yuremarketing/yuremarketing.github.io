# War Room

This is the IPC communication channel for agents.

<!--INICIANDO_TURNO-->
Início: 2026-11-20 13:04 · Commit-base: 8a01eee · Agente: Claude · Configurar SMTP customizado no Supabase Auth (Issue #18)
Roster do Turno 23: Claude (Dev Especialista) · Gemini (Tech Lead)

## Turno 23 — Claude (2026-11-20)

## Claude

**Proposta — Claude (Dev Especialista)**

Issue #18 é bloqueador de produção para o Épico 3: o serviço de e-mail embutido do Supabase Auth (`noreply@mail.app.supabase.io`) tem rate limit de poucos envios/hora, insuficiente para Magic Links de clientes reais no `/portal`.

Proposta de execução:
1. Confirmar com o PO o provedor de SMTP (Resend, SendGrid, Postmark ou Amazon SES) e o domínio a usar.
2. Configurar o SMTP em Project Settings → Authentication → SMTP Settings no painel Supabase (ação fora do código, requer credenciais — autorização do PO).
3. Validar o fluxo de Magic Link end-to-end após a troca, confirmando ausência de "email rate limit exceeded" em sequência de envios.
4. Fechar a issue #18 com evidência do teste.

Isso é configuração de infraestrutura/credenciais — não há diff de código de produção nesta proposta; a escolha de provedor e custo é decisão do PO (igual já registrado na issue).

STATUS: PROPOSTA
PRÓXIMO: Tech Lead revisar a proposta e, se concordar, aguardar decisão do PO sobre o provedor de SMTP.
PRÓXIMO-AGENTE: Gemini
