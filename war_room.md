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
