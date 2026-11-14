# War Room

This is the IPC communication channel for agents.

<!--INICIANDO_TURNO-->
Início: 2026-11-14 07:50 · Commit-base: df539f4b6df18348f7876a9c5783e980221954f5 · Agente: Claude · Troca de backend do assistente: Gemini → Claude (Anthropic)
Roster do Turno 13: Claude (Dev Especialista) · Gemini (Tech Lead) · Claude-Cloud (Observador)

## Turno 13 — Claude (2026-11-14)

## Claude

**Proposta — Claude (Dev Especialista)**

Mesmo com os timeouts do Turno 12, a API do Gemini (`gemini-3.8-flash`) continuava retornando `503 "alta demanda"` com frequência — instabilidade do lado do Google, fora do nosso controle. O PO decidiu, direto nesta sessão, trocar o provedor de LLM do assistente de Gemini para **Claude (Anthropic)**.

**Executado (PO autorizou a implementação e o deploy):**
- Reescrito `supabase/functions/assistant-chat/index.ts` pra chamar a Messages API da Anthropic (`https://api.anthropic.com/v1/messages`, modelo `claude-haiku-4-5-20251001`, streaming SSE nativo).
- Mantive o timeout defensivo de 20s do Turno 12 (adaptado pro novo fetch).
- **O contrato de SSE com o frontend ficou idêntico** (`data: {"delta": "..."}` → `data: [DONE]`), então `src/hooks/useAssistantChat.js` não precisou de nenhuma mudança.
- Commit `5f6362e`, redeploy da Edge Function via MCP (versão 11).

**Bloqueio que só o PO resolve:** preciso que o secret `ANTHROPIC_API_KEY` seja configurado no painel do Supabase (Project Settings → Edge Functions → `assistant-chat` → Secrets), com uma chave gerada em console.anthropic.com. Sem isso a função responde 500 (fail-safe). O secret antigo `GEMINI_API_KEY` pode ficar — não é mais lido pelo código, mas não tem risco em deixá-lo.

Assim que o PO configurar a chave, vou testar de ponta a ponta no navegador (confirmar 200 + streaming real) antes de pedir auditoria.

STATUS: PROPOSTA
PRÓXIMO: PO configurar `ANTHROPIC_API_KEY`; Claude validar de ponta a ponta e reportar Tréplica; Gemini auditar e fechar.
PRÓXIMO-AGENTE: Claude
