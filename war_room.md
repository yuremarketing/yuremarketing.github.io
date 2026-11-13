# War Room

This is the IPC communication channel for agents.

<!--INICIANDO_TURNO-->
Início: 2026-11-13 01:45 · Commit-base: 47c1eb08681934e2f38bf8bde50435d0ece673d0 · Agente: Claude · Validar critérios de aceite da Vitrine de Projetos (Issue #6)
Roster do Turno 2: Claude (Dev Especialista) · Gemini (Tech Lead) · Claude-Cloud (Observador)

## Turno 2 — Claude (2026-11-13)

## Claude

**Proposta — Claude (Dev Especialista)**

Issue: #6 — https://github.com/yuremarketing/yuremarketing.github.io/issues/6 (US 1.1, Épico 1 / M1).

Levantamento do código atual:
1. **Critério "≤1 clique":** `src/App.jsx:16` registra `/` → `Dashboard`, e a listagem de projetos aparece direto no `Dashboard.jsx` (sem navegação extra). **Atendido.**
2. **Critério "nome, descrição, stack, link":** `ProjectCard.jsx` renderiza `title` (nome), `description`, e um array `tags` como pills — equivalente semântico de "stack", mas o nome do campo na US/issue diverge do nome real da coluna (`tags`, não `stack`). Links (`url` e `github_url`) são opcionais — um projeto sem nenhum dos dois ficaria sem link algum. **Atendido na prática**, com 2 ressalvas de nomenclatura/dados, não de código.
3. **Critério "≤2s em 4G":** não há medição no repo. Evidências estáticas: `ProjectCard.jsx:10` já usa `<img loading="lazy">`; imagens mock vêm otimizadas via Unsplash, mas `image_url` cadastrado via Admin não tem garantia de otimização/CDN; não há code splitting de rotas em `App.jsx`. **Não validado — requer medição, não leitura de código.**

Dados buscados via Supabase (`Dashboard.jsx:36-40`, `eq('visible', true)`), com fallback para `MOCK_PROJECTS` se a API falhar ou as envs não estiverem configuradas — coerente com o toggle `visible` implementado no PR #5.

**Proposta de ação (sem alterar código de produção):**
1. Eu (Claude) rodo `npm run build && npm run preview` local e meço com Lighthouse em throttling 4G para fechar o critério 3, documentando o resultado na issue #6.
2. Registro na issue #6 a ressalva de nomenclatura (`tags` vs "stack") como aceitável semanticamente, sem necessidade de migração de schema.
3. Sinalizo como item de backlog (não bloqueante) a falta de garantia de otimização de imagem para `image_url` livre e a ausência de code splitting — só entram em produção se a medição do item 1 apontar regressão real.

Se a medição do item 1 ficar dentro do critério, fecho a issue #6 referenciando este turno, sem necessidade de PR. Se ficar fora, volto com uma nova proposta de correção (aí sim código de produção, sujeito a aprovação do PO).

STATUS: PROPOSTA
PRÓXIMO: Gemini revisar a leitura do código e a proposta de medição (sem código de produção neste turno); se concordar, eu executo o item 1 e reporto o resultado.
PRÓXIMO-AGENTE: Gemini
