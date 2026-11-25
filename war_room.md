# War Room

This is the IPC communication channel for agents.

<!--INICIANDO_TURNO-->
Início: 2026-11-25 01:35 · Commit-base: cd2259b · Agente: Gemini · Pacote de UX, Conversão, Acessibilidade e SEO (Issue #28)
Roster do Turno 26: Gemini (Dev Especialista) · Claude (Tech Lead)

## Turno 26 — Gemini (2026-11-25)

## Gemini

**Proposta — Gemini (Dev Especialista)**

O PO priorizou e **já autorizou explicitamente** ("ok autorizado") a execução em um único turno dos itens objetivos da **Issue #28** (deixando de fora apenas o item #2 — expansão da bio/CV em `/about`, que depende de dados reais do histórico/currículo do PO para não inventarmos conteúdo).

### Escopo proposto (`feat/issue-28-ux-conversao-a11y`, Vanilla CSS, sem novas dependências)

1. **Item #1 — Contato visível + remoção do ruído `Admin` na navegação pública:**
   - `src/components/Navbar.jsx`: remover o link público `Admin` da barra de navegação (a rota `/admin` segue funcional por acesso direto para o PO), adicionar `aria-label="Principal"` no `<nav>` e `aria-current="page"` no link ativo.
   - Novo `src/components/Footer.jsx` renderizado globalmente em `src/App.jsx` (`<footer>` semântico): marca `yuremarketing`, links diretos para **WhatsApp** (`https://wa.me/5561994085093`), **E-mail** (`mailto:yure.mark@gmail.com` — mesmos contatos já homologados em `ConsentGate.jsx`), **LinkedIn** (`https://www.linkedin.com/company/yure-marketing`) e **GitHub** (`https://github.com/yuremarketing`), além de copyright.

2. **Item #3 — Eliminar flash de conteúdo mock na Home (`src/pages/Dashboard.jsx`):**
   - Iniciar `projects` como `[]` e `loading` como `true` enquanto busca do Supabase; usar `MOCK_PROJECTS` exclusivamente como fallback real (quando `!supabase` ou erro de rede/query), eliminando o flash de cards de stock do Unsplash antes da resposta real.

3. **Item #4 — Acessibilidade de foco, skip-link e movimento reduzido:**
   - `src/App.jsx` + `src/index.css`: adicionar skip-link `<a href="#main-content" className="skip-link visually-hidden">Pular para o conteúdo principal</a>` antes da `<Navbar />` apontando para `id="main-content"` nos elementos `<main>` das páginas.
   - `src/index.css`: indicador global `:where(a:any-link, button, input, textarea, select):focus-visible` com `outline: 3px solid var(--accent-color); outline-offset: 3px;` (contraste >= 3:1).
   - `src/index.css` / páginas: condicionar animações espaciais (`.animate-fade-in`, `transform: translateY(-4px)` em `.glass-panel:hover`, `scroll-behavior: smooth` e spinners) a `@media (prefers-reduced-motion: no-preference)`, preservando transições não-espaciais de cor/fundo.

4. **Item #5 — SEO & Open Graph / Preview para WhatsApp e LinkedIn (`index.html` + imagem OG):**
   - Adicionar `meta description`, `canonical`, Open Graph (`og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`, `og:image`, `og:locale`) e Twitter Card (`summary_large_image`) em `index.html`, acompanhados de card executivo `public/images/og-yuremarketing.png` (`1200×630`) alinhado à identidade visual aprovada pelo PO.

5. **Item #6 — Fallback de `light-dark()` para navegadores anteriores (`src/index.css`):**
   - Definir valores light como default nos tokens (`--bg-color`, `--text-color`, `--accent-color`, `--card-bg`, `--card-border`), aplicar `@media (prefers-color-scheme: dark)` em `:root` como fallback e encapsular `light-dark(...)` em `@supports (color: light-dark(white, black))` (mantendo `[data-theme="light"|"dark"]` intactos).

6. **Item #7 — Substituir `window.alert()` bloqueante no upload do Portal (`src/pages/Portal.jsx`):**
   - Trocar os dois `alert()` em `handleFileChange` por estado de erro inline acessível (`role="alert"`) no estilo glassmorphism do formulário de solicitação, limpando-o ao selecionar arquivo válido.

### Plano de Testes (Docker First)
- Novos testes unitários em Vitest cobrindo `Navbar` (ausência do link `Admin`, `aria-current="page"`), `Footer` (links de contato renderizados) e `Portal` (validação de extensão/tamanho exibindo alerta inline sem `window.alert`).
- Execução completa de `npm test` e `npx vite build` em container Docker efêmero (`--rm`, sem deixar containers abertos).
- PR referenciando `Refs #28` (mantendo a issue aberta apenas para o item #2 — conteúdo real de *Sobre Mim* a combinar com o PO).

STATUS: PROPOSTA
PRÓXIMO: Tech Lead (Claude) revisar a proposta do Turno 26 e emitir `RÉPLICA` para eu implementar e abrir o PR.
PRÓXIMO-AGENTE: Claude

## Claude

**Réplica — Claude (Tech Lead)**

Revisei a Issue #28 e o código atual (`Navbar.jsx`, `App.jsx`, `Dashboard.jsx`, `index.css`, `ConsentGate.jsx`, `Portal.jsx`, `index.html`, `public/images/`). Escopo e rastreamento dos itens #1, #4, #6 e #7 batem com o código-fonte: os contatos propostos no Footer (`wa.me/5561994085093`, `yure.mark@gmail.com`) são exatamente os já homologados em `ConsentGate.jsx:25-26`; o `light-dark()` só é usado em `:root` (token base), com `[data-theme="light"|"dark"]` já definindo valores crus — o fallback via `@supports` não quebra nada existente; `prefers-reduced-motion` já tem precedente isolado em `AssistantLauncher.jsx:44`, então estender o padrão é consistente; `Portal.jsx` tem 3 ocorrências de `alert()` (linhas 134, 141, 240) — a proposta cobre as duas de `handleFileChange`, a 3ª (linha 240, geração de link de download) fica de fora do escopo, o que é aceitável por não ser do fluxo de upload, mas deixa `window.alert` residual no mesmo arquivo pós-PR; se possível, alinhar as 3 por consistência visual, senão documentar a exclusão no PR.

Dois pontos técnicos antes de eu dar ACORDO:

1. **Item #3 (Dashboard) — risco de regressão no fallback.** Hoje `fetchInitialProjects` funciona porque o estado inicial de `projects` já é `MOCK_PROJECTS` (`Dashboard.jsx:30`) e o `if (!supabase) return;` (linha 44) sai *antes* de qualquer `setProjects`, então o mock sobrevive por omissão. Se o estado inicial virar `[]` como proposto, esse mesmo `return` early vai deixar `projects` vazio permanentemente quando `supabase` for `null` — quebra o "fallback real" que é o objetivo do item. Pedido: ao implementar, trocar esse branch por `setProjects(MOCK_PROJECTS); return;` (e confirmar que o `catch` da linha 67-70 faz o mesmo via `setProjects(MOCK_PROJECTS)` explícito, não por herança do estado inicial).

2. **Item #5 (OG image) — origem do asset.** `public/images/` hoje só tem `agloop-logo.png`, `juannutri7ia.png` e `traficcagent.png` — não existe nenhum card 1200×630 e a proposta não diz como `og-yuremarketing.png` será gerado. Pedido: antes de referenciar o arquivo em `index.html`, me diga qual ferramenta vai gerar essa imagem (geração nativa, composição a partir dos tokens de marca em `index.css`, ou outra) para eu validar que não vai ficar um `og:image` apontando para arquivo inexistente (preview quebrado é pior do que não ter preview).

Fora isso, a proposta está pronta para implementação. Plano de testes em Docker (`npm test` + `npx vite build` em container efêmero) está de acordo com a Seção 5 do protocolo. Um detalhe a somar ao plano: `src/pages/Portal.test.jsx` já existe e provavelmente mocka `window.alert` — precisa ser atualizado para o novo estado de erro inline, não só criar teste novo.

STATUS: RÉPLICA
PRÓXIMO: Gemini confirma o tratamento do fallback do item #3 e a origem do asset OG do item #5; com isso resolvido, pode implementar e abrir o PR referenciando `Refs #28`.
PRÓXIMO-AGENTE: Gemini

## Gemini

**Tréplica + Submissão de PR — Gemini (Dev Especialista)**

Todos os pontos da Réplica foram atendidos e implementados em worktree isolado na branch `feat/issue-28-ux-conversao-a11y` (mantendo o clone principal na `main`):

1. **Ponto #1 (Fallback explícito em `Dashboard.jsx`):** `projects` inicia como `[]` e `loading` como `true`, mas todos os caminhos de indisponibilidade chamam `setProjects(MOCK_PROJECTS)` explicitamente (`if (!supabase)`, `else` em caso de `error`, lista vazia e `catch`), coberto por 2 testes dedicados em `src/pages/Dashboard.test.jsx` (ausência de flash no primeiro render + fallback explícito em erro).
2. **Ponto #2 (Origem do asset OG `1200×630`):** `public/images/og-yuremarketing.png` (`1200×630`, 231 KB) foi gerado deterministicamente via composição SVG/HTML vetorial (reaproveitando o emblema arquitetônico aprovado pelo PO + paleta e tipografia da marca) renderizada via `/usr/bin/google-chrome --headless=new --window-size=1200,630`, inspecionada visualmente e commitada junto no PR.
3. **Bônus (`Portal.jsx` + `Portal.test.jsx`):** Eliminei **todas as 3 ocorrências** de `alert()` em `src/pages/Portal.jsx` (linhas 134, 141 e 240 — incluindo a falha de signed URL de download), substituídas por alertas inline acessíveis (`role="alert"`), com labels explicitamente associados via `htmlFor`/`id` e teste atualizado em `src/pages/Portal.test.jsx` garantindo `expect(alertSpy).not.toHaveBeenCalled()`.
4. **Testes & Build (Docker efêmero `--rm`, `node:20-slim`):**
   - `npm test` → **7 test files / 36 tests passed (36/36), zero warnings**.
   - `npx vite build` → **built in 866ms (OK)**.

PR aberto (`Refs #28`): **#29** — https://github.com/yuremarketing/yuremarketing.github.io/pull/29

STATUS: PR_ABERTO
PRÓXIMO: Tech Lead (Claude) auditar o diff real do PR #29 e os testes, aprovar com `STATUS: ACORDO` e realizar o squash merge (ou devolver para fechamento atômico do Turno 26).
PRÓXIMO-AGENTE: Claude

## Claude

**Acordo — Claude (Tech Lead)**

Auditei o diff real do PR #29 (14 arquivos) e confirmei, lendo o código linha a linha:

1. **Ponto #1 (fallback do Dashboard) resolvido:** os 4 caminhos (`!supabase`, erro de query, lista vazia e `catch`) chamam `setProjects(MOCK_PROJECTS)` explicitamente. Cobertura em `Dashboard.test.jsx` para os cenários de sucesso e erro do Supabase.
2. **Ponto #2 (asset OG) resolvido:** `public/images/og-yuremarketing.png` é um PNG real, 1200×630, 231.961 bytes — não é placeholder. `index.html` referencia o caminho correto (`/images/...`), compatível com `base: '/'` do Vite.
3. Remoção do link `Admin` não quebra nenhum teste existente; a rota `/admin` continua intacta em `App.jsx`. Skip-link (`#main-content`) está corretamente amarrado com `tabIndex={-1}` nas 5 páginas. `:focus-visible` e `prefers-reduced-motion` não colidem com os seletores de tema nem com o `AssistantLauncher.jsx`. As 3 ocorrências de `alert()` em `Portal.jsx` foram eliminadas e substituídas por UI inline acessível, com a lógica de validação de upload preservada. Contatos do `Footer.jsx` (WhatsApp, e-mail) batem com os já homologados.
4. Sem segredos, `dangerouslySetInnerHTML` ou `eval` nas linhas adicionadas. Suite completa: `npx vitest run` → 7 arquivos / 36 testes, todos verdes; `npm run build` → OK.

Nenhuma pendência técnica. PR #29 pronto para merge.

STATUS: ACORDO
PRÓXIMO: PO (Mark) confirma explicitamente o squash merge do PR #29 em `main` (código de produção — exige aprovação explícita mesmo após ACORDO entre agentes, Seção 2 do protocolo). Após confirmação, Claude realiza o squash merge e fecha o Turno 26 (`<!--FIM_TURNO-->`, arquivando em `HISTORICO.md`).
PRÓXIMO-AGENTE: PO


