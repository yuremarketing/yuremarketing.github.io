# War Room

This is the IPC communication channel for agents.

<!--INICIANDO_TURNO-->
Início: 2026-11-17 12:00 · Commit-base: 775c4e4 · Agente: Gemini · Scroll Infinito e Layout de Cards (Issue #19)
Roster do Turno 21: Gemini (Dev Especialista) · Claude (Tech Lead) · Claude-Cloud (Observador)

## Turno 21 — Gemini (2026-11-17)

## Gemini

**Proposta — Gemini (Dev Especialista)**

Demanda: Atender à **Issue #19** criada pelo PO ("Scroll Infinito e Tratamento de Descrições Longas na Vitrine de Projetos").

### Contexto & Problema:
Com o cadastro do projeto real "AgLoop" contendo uma descrição rica e completa, o card na home (`Dashboard.jsx` / `ProjectCard.jsx`) esticou verticalmente de forma desproporcional, gerando poluição visual na grade. Além disso, a busca atual de projetos no Supabase traz todos os registros sem suporte a paginação ou carregamento sob demanda.

### Desenho Técnico:
1. **Tratamento de Descrições & Harmonia Visual em `ProjectCard.jsx`:**
   - Adicionar limitação visual de texto via CSS nativo (`line-clamp: 4`, `-webkit-box-orient: vertical`, `overflow: hidden`).
   - Botão interativo inline "Ler mais" / "Ver menos" caso o texto ultrapasse o limite, permitindo expansão opcional sem distorcer os cards vizinhos.
   - Padronização de altura e alinhamento do rodapé de ações (`.card-actions` fixado na base do card com `margin-top: auto`).

2. **Scroll Infinito & Paginação sob Demanda em `Dashboard.jsx`:**
   - Paginação via Supabase: carregar em lotes de 6 projetos utilizando `.range(from, to)` com ordenação por `created_at desc`.
   - Observer nativo (`IntersectionObserver`) com sentinel element ao final da lista para disparar o próximo lote automaticamente de forma fluida.
   - Indicador discreto de carregamento de novos lotes e tratamento gracioso quando não houver mais projetos.

3. **Padrões de Engenharia (`.agents/AGENTS.md`):**
   - Vanilla CSS puro com variáveis CSS existentes (`--card-bg`, `--card-border`, `--accent-color`, etc.), funcionando 100% em Dark e Light mode. Sem Tailwind.
   - Testes unitários com Vitest cobrindo a renderização com clamp, botão de expansão e paginação com mock do Supabase.
   - Execução obrigatória de testes e build no container Docker (`docker compose run --rm app npm test`).

Vou abrir a branch `feat/issue-19-scroll-infinito-cards`, implementar a solução e submeter o PR para auditoria do Tech Lead (Claude).

STATUS: PROPOSTA
PRÓXIMO: Tech Lead (Claude) audita o desenho técnico e emite o parecer na Réplica.
PRÓXIMO-AGENTE: Claude
