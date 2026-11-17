<!--INICIANDO_TURNO-->
Início: 2026-11-17 05:25 · Commit-base: 9976ecc · Agente: Gemini · Frontend do Épico 3 (Área Privada do Cliente /portal)
Roster do Turno 18: Gemini (Dev Especialista) · Claude (Tech Lead) · Claude-Cloud (Observador)

## Turno 18 — Gemini (2026-11-17)

## Gemini

**Proposta — Gemini (Dev Especialista)**

Com a migration de banco e storage do Épico 3 (PR #13) mergeada e aplicada no Supabase no Turno 17, a infraestrutura e segurança (R02) estão 100% ativas.
Além disso, sob autoridade delegada, encerrei formalmente a Issue #9 (Épico 2) e atualizei o Marco M2 para Concluído no `roadmap.md`.

**Demanda deste turno:**
Construir o **Frontend do Épico 3** (Área Privada do Cliente) para atender integralmente as User Stories **US 3.1** e **US 3.2** descritas na Issue #12.

### Escopo de Implementação:
1. **Nova Rota `/portal` (`src/pages/Portal.jsx`):**
   - **Fluxo de Autenticação de Cliente:** Login sem senha via Magic Link (`supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: ... } })`).
   - **Gestão de Sessão:** Listener de estado de autenticação; caso deslogado, exibe tela de login de cliente; caso logado, exibe o painel de solicitações e mensagens.
2. **Espaço de Interação 1:1 (US 3.1):**
   - Visualização das solicitações (`client_requests`) do usuário logado e status atual (`pending`, `in_progress`, `completed`).
   - Formulário para submissão de nova solicitação de orçamento com título/descrição.
   - Troca de mensagens vinculada à solicitação (`client_messages`).
3. **Upload de Briefings e Fotos (US 3.2):**
   - Upload direto para o bucket privado `client-assets` seguindo a convenção acordada: `${user.id}/${requestId}/${fileName}`.
   - Validação no frontend: limite de 15MB por arquivo e extensões permitidas (PDF, PNG, JPG, ZIP).
   - Listagem dos anexos com botão de download baseado em Signed URL gerada sob demanda (`supabase.storage.from('client-assets').createSignedUrl(path, 60)`).
4. **Navegação:**
   - Link para `/portal` na `Navbar.jsx`.
5. **Padrões de Engenharia (`.agents/AGENTS.md`):**
   - CSS Puro de alto nível (Vanilla CSS) com variáveis nativas, suporte a Dark/Light mode (`color-scheme`). Sem Tailwind.
   - Testes unitários no Vitest cobrindo a nova página e renderização.

Vou abrir a branch `feat/issue-12-epico3-frontend`, implementar os componentes, rodar os testes da suíte e submeter o PR para auditoria do Tech Lead (Claude).

STATUS: PROPOSTA
PRÓXIMO: Tech Lead (Claude) audita o escopo da proposta de frontend na Réplica.
PRÓXIMO-AGENTE: Claude
