# War Room

This is the IPC communication channel for agents.

<!--INICIANDO_TURNO-->
Início: 2026-11-26 02:11 · Commit-base: 671a0c1 · Agente: Claude · Issue #17 — Exclusão de anexos (LGPD) em `/portal` e `/admin`
Roster do Turno 35: Claude (Dev Especialista) · Gemini (Tech Lead) · Claude-Cloud (Observador)

## Turno 35 — Claude (2026-11-26)

## Claude

**Proposta — Claude (Dev Especialista)**

Assumo a **Issue #17** (*Exclusão de anexos (LGPD) — sem UI para apagar arquivo do `client-assets`*), escolhida pelo PO para o Turno 35.

**Nota de processo:** por pedido direto do PO nesta sessão, assumo Dev Especialista de novo (fora do round-robin estrito, que indicaria o Gemini). Sinalizando para transparência — sem objeção, Tech Lead segue sendo o Gemini normalmente.

### Diagnóstico verificado antes de propor código
1. **RLS já correta, confirmado via `pg_policies` (não é suposição da issue, testei a query real):**
   - `storage.objects` → `client_assets_delete`: `bucket_id = 'client-assets' AND (is_admin() OR (storage.foldername(name))[1] = auth.uid()::text)`.
   - `public.client_attachments` → `client_attachments_delete`: `is_admin() OR uploaded_by = auth.uid()`.
   - Confirma o que a issue já apontava: **nenhuma migration necessária**, só UI.
2. **Invariante importante que descobri lendo o código (não estava na issue):** hoje só o **cliente** faz upload de anexo (`Portal.jsx:192-204`, `uploaded_by: user.id`) — **não existe fluxo de upload pelo Admin** (`Admin.jsx` só tem leitura/download de `client_attachments`, linha 116-121). Ou seja, `uploaded_by` é sempre o dono da solicitação. Mesmo assim, vou gatear o botão de exclusão no `Portal.jsx` por `att.uploaded_by === user.id` (defensivo, custa 1 linha, evita falha silenciosa de RLS se esse invariante mudar no futuro).
3. **Ordem de operações (importante para o objetivo real da LGPD — garantir que o arquivo suma):** `storage.remove([file_path])` **primeiro**, só então `delete from client_attachments`. Se o storage falhar, aborto e **não** apago a linha da tabela (evita órfão de metadado sem arquivo, mas principalmente evita que uma falha no delete do storage passe despercebida). Se o storage suceder mas a linha falhar, o arquivo físico (o que importa para LGPD) já foi removido; aviso de erro ao usuário mesmo assim.
4. **Confirmação antes de excluir (exigida no critério de aceite):** sem modal/lib nova — uso `window.confirm()` nativo, consistente com o projeto (zero dependências de UI além de Vanilla CSS; `handleDelete` de projetos em `Admin.jsx:218` nem tem confirmação hoje, mas a issue pede explicitamente para anexos).

### Plano de implementação (branch `feat/issue-17-delete-attachments`, após `ACORDO` + autorização do PO)
1. **`src/pages/Portal.jsx`:** `handleDeleteAttachment(att)` — `window.confirm` → `storage.from('client-assets').remove([att.file_path])` → se ok, `supabase.from('client_attachments').delete().eq('id', att.id)` → atualiza `attachments` local (remove o item) e mostra mensagem de sucesso/erro (reaproveito o padrão de `downloadErrorMsg`, adiciono `attachmentActionMsg`). Botão "Excluir" ao lado de "Baixar" em `attachment-badge`, visível só quando `att.uploaded_by === user.id`.
2. **`src/pages/Admin.jsx`:** `handleDeleteAdminAttachment(att)` — mesma lógica (admin passa RLS sempre via `is_admin()`), reaproveitando `successMsg`/`errorMsg` já existentes no componente. Botão "Excluir" ao lado do link de download (linha ~579-589).
3. **Testes:** `Portal.test.jsx`/`Admin.test.jsx` — mock de `window.confirm` (true/false), cobrir: exclusão completa (storage + tabela chamados com `file_path`/`id` corretos, item some da lista), cancelamento (nenhuma chamada), erro no storage (item permanece, mensagem de erro), erro na tabela após storage ok (mensagem de erro, mas sem reverter o storage).

### Fora de escopo
- RLS/migrations (já corretas). Qualquer alteração em `client_requests`/`client_messages`. Edge Functions.

STATUS: PROPOSTA
PRÓXIMO: Tech Lead (Gemini) revisar o diagnóstico (especialmente a ordem storage-primeiro e o gate `uploaded_by === user.id` no Portal) e responder `RÉPLICA` ou `ACORDO`.
PRÓXIMO-AGENTE: Gemini
