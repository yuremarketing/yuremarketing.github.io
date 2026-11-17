<!--INICIANDO_TURNO-->
Início: 2026-11-17 04:25 · Commit-base: 5c4c678 · Agente: Gemini · Refinamento do Épico 3 (Área Privada do Cliente)
Roster do Turno 16: Gemini (Dev Especialista) · Claude (Tech Lead) · Claude-Cloud (Observador)

## Turno 16 — Gemini (2026-11-17)

## Gemini

**Proposta — Gemini (Dev Especialista)**

O PO (@yuremarketing) orientou iniciar a concepção e refinamento do **Épico 3 — Área Privada Cliente/Visitante** (Marco M3 do roadmap).

### 1. Diagnóstico e Alinhamento
Atualmente, o Épico 3 está registrado como "Ideia" no `docs/gestao/backlog-produto.md` e atrelado ao risco **R02** em `docs/gestao/matriz-riscos.md`:
> *"Área privada do Épico 3 expõe arquivos/orçamentos entre visitantes por falha de controle de acesso (Probabilidade Média / Impacto Alto)."*

Para mitigar o R02 e estruturar a entrega antes de qualquer código em `src/`, proponho a divisão do Épico 3 em duas User Stories detalhadas e uma especificação arquitetural fundamentada em **Supabase Row Level Security (RLS)** e **Storage Policies**.

---

### 2. Quebra de User Stories (Proposta para `docs/gestao/backlog-produto.md`)

#### **US 3.1 — Autenticação e Espaço de Interação 1:1**
* **Como** cliente ou lead qualificado do Yure,
* **Quero** acessar uma área restrita e segura com meu e-mail,
* **Para** solicitar orçamentos, acompanhar o status das minhas demandas e trocar mensagens diretamente com o Yure sem exposição pública.
* **Critérios de Aceite:**
  1. Login via Magic Link (sem senha) ou OAuth já configurado no Supabase Auth.
  2. Cada usuário autenticado possui sua própria *thread* ou sala de atendimento isolada; nenhum visitante consegue listar ou visualizar dados de outro visitante.
  3. Painel do Yure (Admin já existente em `/admin`) ganha visão unificada para responder e atualizar orçamentos.

#### **US 3.2 — Compartilhamento Seguro de Arquivos e Fotos (Storage Privado)**
* **Como** cliente em negociação de projeto,
* **Quero** fazer upload de arquivos de briefing, imagens de referência e documentos de escopo,
* **Para** que o Yure possa precificar e planejar a execução do serviço com precisão.
* **Critérios de Aceite:**
  1. Upload realizado diretamente para bucket privado no Supabase Storage (`client-assets`).
  2. **RLS & Storage Security:** política que restringe o download/leitura estritamente a: `auth.uid() = owner_id OR is_admin()`. URLs públicas são estritamente desabilitadas (apenas Signed URLs temporárias).
  3. Limite de tamanho por arquivo (ex.: max 15MB) e sanitização de extensões permitidas (PDF, PNG, JPG, ZIP).
  4. Retenção de dados (LGPD): exclusão facilitada a pedido do usuário ou após ciclo de vida do orçamento.

---

### 3. Desenho de Arquitetura & Mitigação do Risco R02
1. **Modelo de Dados (Postgres no Supabase):**
   - Tabela `client_requests` (id, user_id, status, budget_estimate, created_at, updated_at).
   - Tabela `client_messages` (id, request_id, sender_id, message, created_at).
   - Tabela `client_attachments` (id, request_id, file_path, file_name, file_size, uploaded_by).
2. **Políticas RLS:**
   - Habilitação obrigatória de RLS em todas as tabelas: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
   - Regras declarativas: visitantes só acessam onde `auth.uid() = user_id`. O Yure acessa tudo com base em role ou UID admin validado.
3. **Frontend:**
   - Nova rota privada `/portal` ou `/cliente`, protegida por listener de sessão do Supabase.

---

### 4. Próximos Passos
1. Auditoria técnica pelo Tech Lead (Claude).
2. Havendo ACORDO, atualizar a documentação de governança (`docs/gestao/backlog-produto.md`, `docs/gestao/matriz-riscos.md` e `docs/gestao/roadmap.md`).
3. Submeter a especificação refinada para aprovação formal do PO antes de abrir qualquer branch de código.

STATUS: PROPOSTA
PRÓXIMO: Tech Lead (Claude) audita a quebra de US, a modelagem de RLS/Storage para mitigação do risco R02 e a viabilidade no MVP.
PRÓXIMO-AGENTE: Claude
