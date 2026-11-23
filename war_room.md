# War Room

This is the IPC communication channel for agents.

## AgLoopDaemon

**Alerta automático de travamento (vigília)**

Nenhuma resposta em `war_room.md` nos últimos 15 minuto(s). PRÓXIMO-AGENTE pode ter ficado sem vigília religada.

<!--INICIANDO_TURNO-->
Início: 2026-11-23 11:25 · Commit-base: d8fe475 · Agente: Claude · Corrigir OAuth LinkedIn inválido (Issue #23)
Roster do Turno 24: Claude (Dev Especialista) · Gemini (Tech Lead)

## Turno 24 — Claude (2026-11-23)

## Claude

**Proposta — Claude (Dev Especialista)**

PO priorizou a Issue #23 (bug): LinkedIn rejeita o `client_id` atual (`774nfobuuhqwwj`) com "client_id inválido". Investiguei `src/pages/About.jsx` e `src/pages/Callback.jsx` e encontrei **dois problemas distintos**, não só o credencial:

1. **Causa raiz declarada na issue:** `About.jsx:4` tem um fallback hardcoded `|| '774nfobuuhqwwj'` quando `VITE_LINKEDIN_CLIENT_ID` não está definida — esse valor literal no código é o que está sendo usado em produção e o LinkedIn o rejeita (app excluído/trocado/sem o produto "Sign In with LinkedIn using OpenID Connect" ativo). A env var já existe no pipeline (`.github/workflows/deploy.yml:41`, lida de `secrets.VITE_LINKEDIN_CLIENT_ID`), então o secret do GitHub Actions provavelmente está vazio ou desatualizado.
2. **Achado adicional (fora do texto original da issue, mas bloqueador real):** `Callback.jsx` **nunca troca o `code` por um token** — linhas 26-34 geram um `mockLinkedInProfile` fixo (nome "Yure Marketing", foto de stock do Unsplash) e salvam isso no `localStorage` como se fosse o perfil real. Mesmo com um `client_id` válido, a "integração" hoje não autentica ninguém de verdade — é 100% mock. A troca real de `code` por token exige o `client_secret` da LinkedIn, que **não pode ir para o frontend** (Vite expõe qualquer `VITE_*` no bundle); isso requer um backend (ex.: Supabase Edge Function, como já usamos no Épico 3) para fazer essa troca com segurança.

Proposta de execução, em duas frentes:

**A — Credencial (ação do PO, fora de código):**
1. PO verifica no [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps) se o app ainda existe e tem o produto "Sign In with LinkedIn using OpenID Connect" ativo; se não, cria um novo Client ID/Secret.
2. PO registra os Redirect URLs autorizados: `https://yuremarketing.github.io/callback` (prod) e `http://localhost:5173/callback` (dev).
3. PO atualiza o secret `VITE_LINKEDIN_CLIENT_ID` no GitHub Actions e, se formos implementar a troca real (frente B), um novo secret de backend `LINKEDIN_CLIENT_SECRET` (nunca como `VITE_*`).

**B — Código de produção (requer aprovação explícita do PO antes de eu tocar, por ser Cláusula Pétrea):**
1. Remover o fallback hardcoded em `About.jsx:4` — sem `VITE_LINKEDIN_CLIENT_ID` configurada, o botão "Conectar com LinkedIn" fica desabilitado com aviso, em vez de tentar com um ID inválido (atende ao critério de aceite da issue: "validação na UI... caso as credenciais não estejam configuradas").
2. Decisão do PO: manter o mock como está por ora (documentando claramente que é demonstrativo) **ou** implementar a troca real via Edge Function. Recomendo decidir isso agora para não reabrir a issue depois — mas a correção mínima do bug relatado (item 1 + credencial nova) já resolve o erro "client_id inválido".

STATUS: PROPOSTA
PRÓXIMO: Tech Lead revisar o achado do mock em Callback.jsx e o escopo proposto; PO decidir sobre credencial nova e se quer a troca real (Edge Function) nesta issue ou em issue separada.
PRÓXIMO-AGENTE: Gemini

## Claude

**Execução (item B) — Claude (Dev Especialista)**

PO autorizou aplicar a correção mínima (item B.1) agora, sem esperar a decisão sobre o mock/Edge Function.

- Branch `fix/issue-23-linkedin-oauth-clientid`, a partir de `main` (commit-base `d8fe475`).
- Diff: `src/pages/About.jsx` — remove o fallback hardcoded `'774nfobuuhqwwj'`; sem `VITE_LINKEDIN_CLIENT_ID`, botão "Conectar com LinkedIn" fica `disabled` com aviso "Integração com LinkedIn temporariamente indisponível", em vez de disparar OAuth com ID morto.
- Testes: `npm test` → 31/31 passando. `npx vite build` → OK (sem alterar `dist/`, que tem artefatos antigos de root sem relação com este diff).
- PR aberto referenciando a issue (`Refs #23`, não fecha — faltam as ações de credencial do PO e a decisão sobre o mock em `Callback.jsx`): **#25** — https://github.com/yuremarketing/yuremarketing.github.io/pull/25

STATUS: PR_ABERTO
PRÓXIMO: Tech Lead (Gemini) auditar o diff do PR #25 e aprovar com `STATUS: ACORDO`; squash merge após aprovação. Itens A (credencial) e a decisão do item B.2 (mock) seguem em aberto para o PO, fora deste PR.
PRÓXIMO-AGENTE: Gemini
