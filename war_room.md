<!--INICIANDO_TURNO-->
Início: 2026-11-25 11:44 · Commit-base: 722f2db · Agente: Gemini · Issue #37 — Remover fallback silencioso de mocks na vitrine em produção
Roster do Turno 30: Gemini (Dev Especialista) · Claude (Tech Lead) · Claude-Cloud (Observador)

## Turno 30 — Gemini (2026-11-25)

## Gemini

**Proposta — Gemini (Dev Especialista)**

Assumo a **Issue #37** (*Vitrine em produção exibe projetos mockados no lugar dos reais — fallback silencioso mascara a falha*), já que o Turno 29 (Issue #23) foi encerrado e arquivado em `722f2db`.

### Diagnóstico verificado antes de propor código
1. **Supabase em produção (`projects`):** Testei `GET /rest/v1/projects?select=*&visible=eq.true&order=created_at.desc` diretamente contra `https://rzjtksgkljjapzxrnlgm.supabase.co` usando a própria chave `sb_publishable_...` embutida no bundle vivo (`assets/supabase-CuxBdRKv.js`). A API respondeu **HTTP 200** com os **4 projetos reais visíveis** (`TraficcAgent`, `JuanNutri7IA`, `Mundo da Duda`, `AgLoop`). Portanto, os dados existem e a policy `projects_public_read` está íntegra.
2. **Por que o visitante/PO viu mocks:** Em `src/pages/Dashboard.jsx`, `fetchInitialProjects()` cai silenciosamente em `MOCK_PROJECTS` em qualquer erro de rede/query, exceção, `!supabase` ou `data.length === 0` — sem exibir estado de erro nem logar o objeto `error` do Supabase. Qualquer falha transitória (ou sessão expirada no `localStorage` enviando JWT inválido ao PostgREST) faz a home exibir silenciosamente os 2 projetos falsos.
3. **Observação paralela no CI (`.github/workflows/deploy.yml`):** O workflow usa `concurrency: { group: 'pages', cancel-in-progress: true }` e dispara a cada commit em `main` (incluindo commits de `war_room.md`/`HISTORICO.md`). Os runs 168–171 falharam/foram cancelados por concorrência (`No artifacts named "github-pages" were found`).

### Plano de implementação (branch `fix/issue-37-dashboard-no-prod-mocks`, após `ACORDO` + aprovação do PO)
1. **`src/pages/Dashboard.jsx`:**
   - **Zero mocks em produção:** remover o fallback para `MOCK_PROJECTS` na produção (proposta: remover `MOCK_PROJECTS` completamente ou restringir estritamente a `import.meta.env.DEV && !supabase` — aguardo preferência do Tech Lead).
   - **Estado de erro explícito (`initialError`):** em caso de `!supabase`, `error` retornado pelo Supabase ou exceção no `catch`, registrar `console.error('[Dashboard] Erro ao carregar projetos:', error)` e renderizar um estado discreto na seção (*"Não foi possível carregar os projetos agora."*) com botão **"Tentar novamente"** chamando `fetchInitialProjects()`.
   - **Estado vazio explícito:** quando `!error` e `data.length === 0`, exibir mensagem limpa (*"Novos projetos em breve."*) em vez de dados inventados.
   - **Header sem ruído:** só exibir o contador `{projects.length} projetos` quando `!loading && !initialError`.
2. **`src/pages/Dashboard.test.jsx`:**
   - Substituir o teste antigo que esperava fallback para `MOCK_PROJECTS` em erro e cobrir explicitamente os cenários exigidos na Issue #37:
     1. Loading inicial sem flash de mocks;
     2. Sucesso com projetos reais do Supabase;
     3. Erro do Supabase (e exceção de rede) → exibe estado de erro + botão retry + `console.error`, **nunca** renderiza mocks;
     4. Lista vazia (`[]`) → exibe estado vazio explícito, **nunca** renderiza mocks.
3. **`.github/workflows/deploy.yml` (se o Tech Lead aprovar incluir no mesmo PR):**
   - Trocar `cancel-in-progress: true` → `false` (recomendação oficial do GitHub Pages para não cancelar deploys em andamento).
   - Adicionar `paths-ignore` para `war_room.md`, `HISTORICO.md` e `docs/**` para que turnos da Sala de Guerra não disparem builds/deploys desnecessários nem concorram com merges de código.

### Fora de escopo
- Alteração de migrations/RLS no Supabase (os 4 projetos reais já respondem `200 OK` na leitura anônima).
- Outras páginas além de `Dashboard.jsx`.

STATUS: PROPOSTA
PRÓXIMO: Tech Lead (Claude) revisar a proposta do Turno 30 (preferência sobre remover `MOCK_PROJECTS` de vez vs. manter só em `DEV && !supabase`, e se incluímos o ajuste de `deploy.yml` no mesmo PR) e emitir `RÉPLICA` ou `ACORDO`.
PRÓXIMO-AGENTE: Claude

## Claude

**Réplica — Claude (Tech Lead)**

Confirmei o diagnóstico contra o código real antes de decidir os pontos em aberto: `Dashboard.jsx:48` (`!supabase`), `:65` (`data.length > 0 ? data : MOCK_PROJECTS`) e `:71/:77` (erro e exceção) de fato caem em `MOCK_PROJECTS` sem distinguir DEV de PROD, e `Dashboard.test.jsx:59-74` hoje **exige** esse fallback no caso de erro — esse teste precisa ser substituído, não só complementado. No `deploy.yml`, confirmei `cancel-in-progress: true` sem `paths-ignore`, batendo com os runs 168–171 cancelados.

Decisões sobre os pontos em aberto:

1. **`MOCK_PROJECTS`: restringir a `import.meta.env.DEV && !supabase`, não remover de vez.** Mantém o dev local usável sem `.env` configurado, mas nenhum outro caminho (erro, exceção, lista vazia) pode cair em mock, **nem em DEV com `supabase` configurado**. Ou seja, mock só serve para "não tenho client Supabase nenhum, estou prototipando sem `.env`" — todo o resto (erro de rede, exceção no `catch`, `data.length === 0`) é estado real, sempre, independente de `DEV`/`PROD`.
2. **O `catch` (linha 75-79) precisa do mesmo tratamento:** hoje ele também cai em `MOCK_PROJECTS` em qualquer exceção (ex.: falha no `import('../lib/supabase')`). Deve virar `initialError` nesse caso, igual ao branch de `error` do Supabase — a única saída para mock é a ausência do client em DEV, verificada antes do `try` de rede, não dentro do `catch`.
3. **`deploy.yml`: aprovo as duas mudanças no mesmo PR** (`cancel-in-progress: false` e `paths-ignore` para `war_room.md`/`HISTORICO.md`/`docs/**`) — é a prática recomendada do GitHub Pages e resolve exatamente os runs cancelados que você achou. Peço incluir também `.claude/**` no `paths-ignore`, já que mudanças de skills/governança também não deveriam competir por deploy.
4. **Requisito de teste adicional:** além dos 4 cenários já listados, cobrir a regressão do `catch` (exceção real, ex. `import()` rejeitando) para garantir que ela também vira `initialError` e não mock — hoje não há teste nenhum para esse branch.

Sem outras objeções à arquitetura (estado de erro + retry reaproveitando o padrão que `fetchMoreProjects` já usa, estado vazio explícito, contador condicionado a `!loading && !initialError`). `deploy.yml` e `Dashboard.jsx` são código de produção — PR normal pelo Gate da Seção 5, aprovação final do PO antes do merge.

STATUS: RÉPLICA
PRÓXIMO: Gemini implementar considerando os 4 pontos acima, rodar testes + build em Docker (incluindo o teste de regressão do `catch`) e abrir o PR referenciando `Refs #37` para auditoria.
PRÓXIMO-AGENTE: Gemini

## Gemini

**Tréplica + Submissão de PR — Gemini (Dev Especialista)**

Implementados os 4 pontos acordados na Réplica em worktree isolado (`/tmp/wt-issue-37`, mantendo o clone principal intocado em `main` para evitar race conditions):

1. **`MOCK_PROJECTS` restrito a `import.meta.env.DEV && !supabase` (`src/pages/Dashboard.jsx`):** verificado fora do `try/catch` de rede. Em produção (`!DEV`), `!supabase` loga `console.error` e exibe `initialError`.
2. **Todos os caminhos de erro/exceção (`error` do Supabase, `catch` de rede e `catch` na importação de `../lib/supabase`):** registram `console.error` e renderizam estado discreto (`role="alert"`) com botão **"Tentar novamente"** chamando `fetchInitialProjects()` — nunca caem em mock, nem em DEV.
3. **Lista vazia (`data.length === 0`):** renderiza estado vazio explícito (`role="status"` — *"Novos projetos em breve."*), sem mocks; contador do header exibido apenas quando `!loading && !initialError`.
4. **`.github/workflows/deploy.yml`:** `concurrency.cancel-in-progress: false` + `paths-ignore` cobrindo `war_room.md`, `HISTORICO.md`, `docs/**` e `.claude/**`.
5. **Testes (`src/pages/Dashboard.test.jsx`):** 7 testes cobrindo loading sem flash de mock, sucesso, erro do Supabase + retry com recuperação, lista vazia, `catch` de rede, `catch` na inicialização/import do Supabase, `!supabase` em produção (`DEV=false`) e fallback exclusivo em `DEV=true && !supabase`.

### Verificação (Docker efêmero `--rm`, `node:20-slim`, worktree limpo sem `.env`)
- `npm test` → **9 test files / 50 tests passed (50/50)**
- `npx vite build` → **built in 810ms (OK)**

PR aberto (`Refs #37`): **#38** — https://github.com/yuremarketing/yuremarketing.github.io/pull/38 (commit `15280e3`)

STATUS: PR_ABERTO
PRÓXIMO: Tech Lead (Claude) auditar o diff real do PR #38 e os testes e emitir `STATUS: ACORDO` (para então solicitarmos autorização formal do PO antes do merge, conforme Cláusula Pétrea).
PRÓXIMO-AGENTE: Claude

## Claude

**Auditoria + Acordo — Claude (Tech Lead)**

Busquei a branch `fix/issue-37-dashboard-no-prod-mocks` (commit `15280e3`) e auditei em worktree isolado (`/tmp/wt-audit-37`, descartado depois, sem tocar o clone principal em `main`):

- `git diff main` (4 arquivos, 222+/62-): `deploy.yml`, `Dashboard.jsx`, `Dashboard.test.jsx` batem exatamente com os 4 pontos acordados na Réplica — `MOCK_PROJECTS` só em `DEV && !supabase` verificado fora do `try/catch` de rede; `catch` de import e `catch` de rede e `error` do Supabase convergem todos para `initialError` (nunca mock); lista vazia com estado próprio (`role="status"`); `deploy.yml` com `cancel-in-progress: false` e `paths-ignore` cobrindo `war_room.md`/`HISTORICO.md`/`docs/**`/`.claude/**`.
- Rodei eu mesmo (não só confiei no relato) em Docker efêmero (`node:20-slim`, sem `.env`): `npm test` → **9 arquivos / 50 testes passando (50/50)**; `npx vite build` → **built in 859ms (OK)**. Único workflow do repo é o `deploy.yml` auditado — não há CI separado para checar.

Sem achados. Arquitetura, testes e CI conferem com o que foi acordado.

STATUS: ACORDO

PRÓXIMO-AGENTE: PO

> [!CAUTION]
> **AUTORIZAÇÃO FORMAL NECESSÁRIA — Cláusula Pétrea (código de produção)**
>
> ```
> ╔══════════════════════════════════════════════════════════════════╗
> ║   PR #38 — fix/issue-37-dashboard-no-prod-mocks — pronto p/ merge  ║
> ╚══════════════════════════════════════════════════════════════════╝
> ```
>
> **O quê:** merge do PR #38 em `main` — remove o fallback silencioso de `MOCK_PROJECTS` em produção (`Dashboard.jsx`) e ajusta `deploy.yml` (`cancel-in-progress: false` + `paths-ignore`).
> **Por quê:** Issue #37 — a vitrine pública estava mostrando 2 projetos falsos sempre que o Supabase falhava/retornava vazio, sem nenhum sinal de erro.
> **Verificado:** diff auditado linha a linha pelo Tech Lead, 50/50 testes passando e build OK em Docker limpo, sem `.env`. Sem segredo novo, sem RLS alterada.
> **Risco residual:** nenhum identificado — é só UI/estado de erro + config de CI, nenhum dado sensível envolvido.
>
> **Responda "ok" ou "autorizo" para o PR #38 ser mergeado (squash) em `main`.**
