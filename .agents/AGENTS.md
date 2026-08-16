# 🤖 AI Engineering & Development Rules (`AGENTS.md`)

Este documento estabelece o padrão de engenharia de software e AI Engineering para o desenvolvimento do portfólio e projetos correlatos. Todas as interações, autoria de código e operações de infraestrutura devem seguir rigorosamente estes princípios.

---

## 🐋 1. Infraestrutura & Containerização (Docker First)
- **Zero Poluição Local:** Nenhuma dependência de runtime (Node.js, npm, Python, etc.) deve ser instalada diretamente na máquina host. Todo o ambiente de desenvolvimento, build e testes roda isolado em containers Docker.
- **Docker Compose para Dev:** O ambiente de desenvolvimento deve ser orquestrado via `docker-compose.yml` com suporte a Live Reload / Hot Module Replacement (HMR).
- **Volumes Isolados:** A pasta `node_modules` deve ser mantida estritamente dentro do volume do Docker, mantendo a máquina host totalmente limpa.

---

## 🎨 2. Design System & Frontend Standard
- **Stack:** Vite + React (JavaScript moderno / ES modules).
- **CSS Strategy:** CSS puro de alto nível (Vanilla CSS) com variáveis CSS nativas, Glassmorphism, animações dinâmicas e suporte total a temas (**Dark/Light Mode**) via `color-scheme` e `light-dark()`.
- **Proibido TailwindCSS:** A menos que explicitamente solicitado.
- **Acessibilidade & UI:** Componentes semânticos (HTML5), micro-interações fluidas e responsividade mobile-first.

---

## 🔒 3. Segurança & Gestão de Segredos
- **Ambiente (`.env`):** Segredos (`LINKEDIN_CLIENT_SECRET`, `SUPABASE_ANON_KEY`, `API_KEY`) nunca devem ser expostos ou commitados no Git.
- **Controle de Acesso:** Autenticação no Admin via Supabase Auth (Email/Senha).

---

## 🚀 4. Qualidade de Código & Automação (CI/CD)
- **Deploy:** GitHub Actions (`deploy.yml`) para build automatizado e publicação no GitHub Pages (`yuremarketing.github.io`).
- **Arquitetura Modular:** Separação clara entre componentes (`/src/components`), páginas (`/src/pages`), hooks (`/src/hooks`), e integrações de API (`/src/lib`).

---

## ⚙️ 5. Fluxo de Trabalho do Agente AI
- **Modo Planejamento:** Alterações estruturais ou de infraestrutura exigem validação prévia de plano de execução.
- **Verificação Contínua:** Nenhuma funcionalidade é considerada concluída sem verificação de build ou testes operacionais dentro do container Docker.
