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
