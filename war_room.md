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

## Claude

**Réplica — Claude (Tech Lead)**

Proposta bem estruturada: a quebra em US 3.1/3.2, o uso de Magic Link, Signed URLs e a atenção a LGPD estão alinhados com o risco R02. Concordo com a direção geral. Mas antes de ACORDO, preciso de uma definição concreta num ponto que é exatamente o cerne do R02: **como `is_admin()` é implementado**.

Auditei o schema atual (`supabase/migrations/20261114120000_create_projects.sql`). Hoje o padrão de RLS do projeto é:

```sql
create policy "projects_authenticated_write"
  on public.projects for all to authenticated
  using (true) with check (true);
```

Ou seja, **"admin" hoje = "qualquer usuário autenticado"**, porque até agora o único usuário autenticado é o próprio Yure. Esse atalho quebra assim que Épico 3 introduzir clientes autenticados via Magic Link: se as novas tabelas (`client_requests`, `client_messages`, `client_attachments`) ou o bucket `client-assets` reusarem esse mesmo padrão em qualquer policy, todo cliente autenticado passa a ter acesso de admin — é literalmente o cenário do R02 (vazamento entre visitantes), só que via painel do Yure em vez de entre clientes.

Preciso de resposta objetiva em 2 pontos antes de aprovar:

1. **Definição de `is_admin()`:** função baseada em custom claim no JWT (`auth.jwt() ->> 'role'`), tabela `admins` com o UID fixo do Yure, ou outro mecanismo? Qualquer um serve, mas precisa estar explícito na spec — e as policies existentes de `projects` (`authenticated_read`/`authenticated_write`) precisam entrar no escopo de revisão do Épico 3, já que hoje elas são o ponto de entrada admin-via-autenticação que vai colidir com clientes autenticados.
2. **RLS em `storage.objects`:** a proposta menciona "Signed URLs temporárias" mas Signed URLs não substituem RLS no bucket — o Storage do Supabase aplica RLS em `storage.objects` independentemente, e quem gera a signed URL (cliente vs. admin) também precisa estar coberto por policy. Falta a convenção de path (ex.: `client-assets/{user_id}/{request_id}/arquivo`) que a policy vai usar pra comparar com `auth.uid()`.

Resto da proposta (modelo de dados, critérios de aceite, retenção LGPD) está sólido e não vejo necessidade de mudança.

STATUS: RÉPLICA
PRÓXIMO: Gemini detalha a implementação de `is_admin()` e a convenção de path/policy de `storage.objects`, incluindo o plano de revisão das policies existentes de `projects`.
PRÓXIMO-AGENTE: Gemini

## Gemini

**Tréplica — Gemini (Dev Especialista)**

Excelente auditoria do Tech Lead. O achado sobre o padrão atual de `projects_authenticated_write` é cirúrgico: sem segregação de perfil, qualquer cliente logado ganharia privilégios de edição no portfólio.

Aqui estão as definições concretas para sanar os dois pontos:

### 1. Definição de `is_admin()` e Revisão das Policies de `projects`

Adotamos a abordagem de tabela dedicada `public.admins` com função helper `SECURITY DEFINER`:

```sql
-- Tabela de administradores (apenas o UID do Yure)
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

alter table public.admins enable row level security;

-- Ninguém altera admins via API cliente; leitura restrita a si mesmo
create policy "admins_read_self" on public.admins
  for select to authenticated
  using (user_id = auth.uid());

-- Helper para checagem rápida em todas as RLS policies
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = auth.uid()
  );
$$;
```

**Revisão das policies existentes de `projects`:**
Na migration do Épico 3, a policy atual de `projects` será atualizada:
```sql
drop policy if exists "projects_authenticated_write" on public.projects;

create policy "projects_admin_write"
  on public.projects for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
```
Dessa forma, clientes autenticados via Magic Link continuam com acesso somente-leitura aos projetos públicos, e apenas o Yure pode criar/editar/excluir.

---

### 2. Convenção de Paths e RLS em `storage.objects`

O bucket `client-assets` será configurado como **privado** (`public = false`).

**Convenção de Path:**
`client-assets/{user_id}/{request_id}/{filename}`

**Storage Policies declarativas em `storage.objects`:**

```sql
-- 1. INSERT (Upload): o cliente só pode subir arquivos em sua própria pasta {user_id}/...
create policy "client_assets_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'client-assets' and
    (
      public.is_admin() or 
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 2. SELECT (Download / criação de Signed URL): só o dono da pasta ou o admin pode ler
create policy "client_assets_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'client-assets' and
    (
      public.is_admin() or 
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- 3. DELETE (Exclusão a pedido ou limpeza): só o dono ou admin
create policy "client_assets_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'client-assets' and
    (
      public.is_admin() or 
      (storage.foldername(name))[1] = auth.uid()::text
    )
  );
```

Com isso:
- O Storage valida a árvore em nível de banco (`storage.foldername(name)[1] = auth.uid()`).
- O isolamento entre clientes é físico e lógico, impedindo qualquer acesso cruzado mesmo se um cliente adivinhar o `request_id` de outro.
- O Yure (`public.is_admin() = true`) tem visibilidade completa sobre todos os briefings e imagens submetidos para responder os orçamentos.

STATUS: TRÉPLICA
PRÓXIMO: Tech Lead (Claude) valida as respostas técnicas e formaliza o ACORDO para fechamento do turno e submissão ao PO.
PRÓXIMO-AGENTE: Claude

