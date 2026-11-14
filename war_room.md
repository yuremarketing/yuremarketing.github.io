<!--INICIANDO_TURNO-->
Início: 2026-11-14 05:14 · Commit-base: f5a2abe5a828e1fc14421d8b92b0c2a865f335ee · Agente: Gemini · Resolução da Issue #10: Resiliência contra 503 via Retry e Fallback de Modelos
Roster do Turno 14: Gemini (Dev Especialista) · Claude (Tech Lead) · Claude-Cloud (Observador)

## Turno 14 — Gemini (2026-11-14)

## Gemini

**Proposta — Gemini (Dev Especialista)**

Meta: Resolver a Issue #10 aberta pelo Claude ("Instabilidade da API do Gemini (503 'alta demanda') no assistente de IA"), mantendo o custo zero para o PO (100% no tier gratuito do Google AI Studio).

**Diagnóstico & Solução Arquitetural:**
O código atual da Edge Function faz uma única tentativa no modelo configurado (`gemini-3.8-flash`). Quando o Google AI Studio sofre picos de concorrência global no endpoint v1beta, o modelo pode retornar momentaneamente `503 UNAVAILABLE`.

Para eliminar o erro pro visitante sem gerar custos adicionais de APIs pagas, implementarei na Edge Function (`supabase/functions/assistant-chat/index.ts`):
1. **Fallback em Cascata de Modelos:**
   - Lista prioritária de modelos da família Gemini Flash: `[Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"]`.
2. **Retry Automático com Backoff:**
   - Se o modelo retornar `503` ou `429`, a função executa retry com backoff (ex: 600ms) antes de chavear para o modelo alternativo da cascata.
3. **Preservação de Timeouts e Contratos:**
   - O timeout total da Edge Function (20s) e o timeout do cliente (25s) do Turno 12 são rigorosamente mantidos.
   - O contrato de streaming SSE (`data: {"delta": "..."}` → `data: [DONE]`) permanece 100% inalterado.

Vou criar a branch `fix/issue-10-gemini-resilience`, implementar o código, rodar os testes da suíte e submeter o diff para auditoria do Claude (Tech Lead) e aprovação do PO antes do deploy.

STATUS: PROPOSTA
PRÓXIMO: Claude auditar a proposta da Issue #10 na Réplica.
PRÓXIMO-AGENTE: Claude

## Claude

**Réplica — Claude (Tech Lead)**

Arquitetura faz sentido e ataca a causa certa (instabilidade pontual do endpoint, não erro nosso). Concordo com cascata de modelos + retry, custo zero, sem tocar no contrato SSE. Dois pontos técnicos antes de você implementar:

1. **Orçamento de tempo precisa ser explícito.** Com 3 modelos × retry com backoff, é fácil estourar os 20s de timeout da Edge Function somados (aí o visitante recebe o erro genérico de timeout, não o conteúdo — voltamos ao mesmo sintoma por outro caminho). Sugiro: timeout curto por tentativa individual (~6-7s), no máximo 1 retry por modelo antes de cair pro próximo da cascata, e um orçamento total que pare de tentar com folga antes dos 20s (pra sempre sobrar tempo de responder algo, nem que seja o erro, antes do timeout do cliente cortar a conexão).
2. **Logging de qual modelo respondeu.** Um `console.log` indicando qual item da cascata serviu a resposta (ou que todos falharam) vai ajudar a enxergar se isso está realmente funcionando em produção, sem precisar ficar lendo `function_logs` às cegas como fizemos nos Turnos 11-13.

Sem mais objeções. Pode implementar na branch, eu audito o diff real (`git diff`) + rodo os testes antes de aprovar.

STATUS: RÉPLICA
PRÓXIMO: Gemini implementar na branch `fix/issue-10-gemini-resilience` e submeter o diff.
PRÓXIMO-AGENTE: Gemini

## Gemini

**Tréplica — Gemini (Dev Especialista)**

Implementado conforme acordado na Réplica:
1. **Orçamento de Tempo Rigoroso:**
   - Orçamento global de 16s (`GLOBAL_DEADLINE_MS = 16000`), com timeout individual de 6s (`ATTEMPT_TIMEOUT_MS = 6000`).
   - Máximo de 1 retry por modelo em caso de `503` ou `429` com backoff de 500ms.
   - Preserva folga confortável antes do timeout da Edge Function (20s) e do cliente (25s).
2. **Cascata de Modelos:**
   - Lista: `[Deno.env.get("GEMINI_MODEL") ?? "gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"]`.
3. **Observabilidade & Logs:**
   - `console.log` explícito indicando o modelo vencedor e tempo de resposta.
   - `console.warn` em caso de falha de modelo com status e mensagem de erro.
4. **Testes & PR:**
   - Testes da suíte Vitest rodados no container Docker (`docker compose run --rm app npm test`) e aprovados (1 passed).
   - PR aberto: #11 (https://github.com/yuremarketing/yuremarketing.github.io/pull/11) na branch `fix/issue-10-gemini-resilience`.

STATUS: TRÉPLICA
PRÓXIMO: Claude auditar o diff do PR #11, emitir STATUS: ACORDO e solicitar autorização do PO para o merge e redeploy da Edge Function via MCP.
PRÓXIMO-AGENTE: Claude

## Claude

**Auditoria Técnica — Claude (Tech Lead)**

Revisei o diff real do PR #11 (`gh pr diff 11`), não só a descrição:

1. **Orçamento de tempo:** confirmado — `timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remainingTime)` clampa cada tentativa ao que sobra do `GLOBAL_DEADLINE_MS` (16s), e o checkpoint no topo dos dois loops evita começar uma nova tentativa/modelo depois de estourar o orçamento. Resolve exatamente o que pedi na Réplica.
2. **Observação menor, não-bloqueante:** o piso `Math.max(1000, ...)` pode deixar uma última tentativa rodar ~1s além do orçamento de 16s em cenários de ponta (ex.: sobrou 50ms, ainda assim roda até 1s). Na pior hipótese isso leva o total a ~17s — ainda folgado em relação ao timeout do cliente (25s). Não precisa bloquear o merge por causa disso; é um ajuste de polimento pra um turno futuro, se alguém quiser.
3. **Fallback/retry:** lógica de 503/429 → retry único com backoff, 404/outros → pula pro próximo modelo sem retry — correto e evita desperdiçar orçamento em erros não-transitórios.
4. **Logs:** `console.log` do modelo vencedor + tempo, `console.warn` por modelo que falhou — exatamente o que pedi, vai dar visibilidade real em produção.
5. **Contrato SSE e CORS:** inalterados, sem novos secrets, sem risco de segurança introduzido.
6. **Testes:** suíte Vitest (React/frontend) segue verde, mas não cobre a Edge Function (Deno) — isso já era assim antes do PR, não é regressão introduzida por ele; essa função nunca teve cobertura automatizada, só validação manual (curl/navegador) nos turnos anteriores.

**Decisão: STATUS: ACORDO.** Sem bloqueios. Falta só a autorização do PO pra mergear o PR #11 e redeployar a Edge Function via MCP — é código de produção, não eu que decido sozinho.

STATUS: ACORDO
PRÓXIMO: PO autorizar merge do PR #11 e redeploy da Edge Function.
PRÓXIMO-AGENTE: PO
