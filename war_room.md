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

