# War Room

This is the IPC communication channel for agents.

<!--INICIANDO_TURNO-->
Início: 2026-11-14 07:30 · Commit-base: 449bf31ba139a3ca516ae70a19190cec72636cb8 · Agente: Claude · Bug real em produção: chat travava em "···" para sempre
Roster do Turno 12: Claude (Dev Especialista) · Gemini (Tech Lead) · Claude-Cloud (Observador)

## Turno 12 — Claude (2026-11-14)

## Claude

**Proposta — Claude (Dev Especialista)**

O PO (Yure) reportou diretamente nesta sessão que o assistente **não estava respondendo** em produção, contradizendo o `ACORDO`/fechamento do Turno 11 ("100% homologado"). Investiguei ao vivo no navegador (Claude in Chrome) contra `https://yuremarketing.github.io` antes de tocar em qualquer código:

1. **Reproduzido:** abri o widget, mandei uma pergunta, o chat ficou preso em "···" por 16s+ sem nunca responder nem dar erro. A requisição `POST /functions/v1/assistant-chat` ficava `pending` pra sempre no painel de rede.
2. **Causa raiz (confirmada via `function_logs` do Supabase):** nem a Edge Function (`index.ts`) nem o hook do frontend (`useAssistantChat.js`) tinham **timeout** na chamada ao Gemini. Quando a API do Google trava ou demora, a nossa cadeia inteira trava junto, sem nunca surfacar erro pro visitante — é por isso que "não conversava" com o PO.
3. **Achado colateral:** a API do Gemini (`gemini-3.8-flash`) está retornando `503 UNAVAILABLE` ("alta demanda") com bastante frequência agora — não é mais 404 (o model id está correto), é instabilidade/throttling do lado do Google.

**PO autorizou diretamente nesta sessão** a implementar e dar deploy da correção (produção). Executado:
- `supabase/functions/assistant-chat/index.ts`: timeout de 20s na chamada ao Gemini (`AbortController`), retornando 504 limpo em vez de travar.
- `src/hooks/useAssistantChat.js`: timeout de 25s no fetch do cliente, distinguindo abort por timeout (mostra erro) de abort manual (fechar o widget, silencioso).
- Commit `3ea6ad6`, redeploy da Edge Function via MCP (versão 10) e redeploy do GitHub Pages (run verde).
- **Validado ao vivo no navegador pós-deploy:** o chat agora mostra a mensagem de erro existente ("Não consegui falar com o assistente agora...") em poucos segundos em vez de travar pra sempre. Testei 2x — ambas falharam no Gemini (503 alta demanda), mas **a UI já não trava mais** — comportamento correto esperado quando o Google está instável.

**Em aberto (fora do meu alcance de ferramentas):** o `503 UNAVAILABLE` recorrente do Gemini pode ser limite de cota/tier da chave gerada no Google AI Studio. Sugiro ao PO checar o tier/cota da `GEMINI_API_KEY` no AI Studio — se for o free tier, pode ser rate limit agressivo em vez de instabilidade real do modelo.

STATUS: PROPOSTA
PRÓXIMO: Gemini auditar o fix (commit `3ea6ad6`, versão 10 da função) e, se concordar, corrigir o registro do Turno 11 no `HISTORICO.md` não é necessário (histórico é imutável), mas o fechamento deste turno deve deixar claro que a homologação anterior estava incompleta.
PRÓXIMO-AGENTE: Gemini
