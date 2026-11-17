# Backlog de Produto

## Visão
- **Problema:** recrutadores e clientes não têm hoje um lugar centralizado e profissional pra avaliar rapidamente os projetos e a experiência do Yure.
- **Público:** recrutadores técnicos / gestores de contratação, e clientes em potencial (freelance/consultoria).
- **Sucesso:** nº de contatos recebidos (via formulário ou LinkedIn) originados pelo portfólio.

## Épico 1 — Vitrine de Projetos · Status: Concluído (US 1.1 entregue, PRs #4 e #6)

### User Story 1.1
Como recrutador, quero ver rapidamente os projetos mais relevantes do Yure com contexto técnico (stack, problema resolvido, resultado), para decidir se ele é fit pra vaga sem precisar pedir mais informação.

Critérios de aceite:
- Lista de projetos visível na home, sem precisar navegar mais de 1 clique.
- Cada projeto mostra: nome, descrição curta, stack usada e link (demo e/ou repositório).
- Lighthouse Performance Score ≥ 0.90 em mobile, FCP ≤ 1.5s e LCP ≤ 3.0s sob perfil simulado Slow 4G (ou ≤ 2.0s em rede 4G convencional).

## Épico 2 — Assistente de IA no Portfólio · Status: Concluído (US 2.1 entregue, PR #11)

### User Story 2.1
Como visitante do portfólio, quero me cadastrar rapidamente (nome + e-mail, ou login via LinkedIn) e conversar com um assistente de IA sobre o Yure e seus projetos, para decidir se quero entrar em contato sem precisar ler tudo manualmente.

**Critérios de aceite:**
- Antes de iniciar a conversa, o visitante vê uma caixa de consentimento **não pré-marcada**; só é possível conversar depois de marcá-la explicitamente.
- Cadastro aceita nome + e-mail OU login via LinkedIn OAuth, sem exigir ambos.
- O histórico da conversa vive apenas em memória do navegador durante a sessão — **não é persistido no Supabase por padrão**. Recarregar a página limpa a conversa.
- Nome e e-mail só são retidos no servidor enquanto necessários para viabilizar um contato de retorno; não há uso para marketing sem consentimento separado.
- O visitante tem acesso visível a um link para a política de privacidade (`docs/gestao/politica-privacidade.md`, quando publicada) antes de marcar o consentimento.

**Dependências (ver R01 na matriz de riscos):**
- `docs/gestao/mapa-dados-pessoais.md` — mapa de dados pessoais, redigido.
- `docs/gestao/politica-privacidade.md` — rascunho redigido, **pendente de aprovação do PO** antes de ir para produção como página pública `/privacidade`.
- Escolha do provedor de LLM e confirmação dos termos de retenção/treinamento desse provedor.

⚠️ **US 2.1 pode ser refinada agora, mas não entra em desenvolvimento (branch/código de produção) até o PO aprovar o texto da política de privacidade e o provedor de LLM estar confirmado.**

## Épico 3 — Área Privada Cliente/Visitante · Status: Concluído (US 3.1 e US 3.2 implementadas — backend/RLS no PR #13, Turno 17; frontend `/portal` e painel admin no PR #14, Turno 18)

### User Story 3.1 — Autenticação e Espaço de Interação 1:1
Como cliente ou lead qualificado do Yure, quero acessar uma área restrita e segura com meu e-mail, para solicitar orçamentos, acompanhar o status das minhas demandas e trocar mensagens diretamente com o Yure sem exposição pública.

**Critérios de aceite:**
- Autenticação de clientes via Magic Link (e-mail sem senha) ou OAuth via Supabase Auth.
- Cada usuário autenticado possui sua própria sala/thread de atendimento isolada; nenhum visitante consegue listar ou visualizar dados de outro visitante.
- Painel do Yure (Admin em `/admin`) ganha visão unificada para responder e atualizar orçamentos.
- Modelo de dados com RLS ativado: tabelas `client_requests` e `client_messages` com acesso estritamente restrito a `auth.uid() = user_id OR public.is_admin()`.

### User Story 3.2 — Compartilhamento Seguro de Arquivos e Fotos (Storage Privado)
Como cliente em negociação de projeto, quero fazer upload de arquivos de briefing, imagens de referência e documentos de escopo, para que o Yure possa precificar e planejar a execução do serviço com precisão.

**Critérios de aceite:**
- Upload direto para bucket privado no Supabase Storage (`client-assets`).
- Convenção de caminho isolada por cliente: `client-assets/{user_id}/{request_id}/{filename}`.
- RLS em `storage.objects` bloqueando download/leitura cruzada: apenas `auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()`. URLs públicas são desabilitadas; downloads utilizam Signed URLs temporárias.
- Limite de tamanho de arquivo (max 15MB) e extensões permitidas (PDF, PNG, JPG, ZIP).
- Retenção de dados (LGPD): suporte a exclusão a pedido do usuário ou término do ciclo de vida do orçamento.

**Requisitos Técnicos de Segurança (Risco R02 Mitigado no Desenho):**
- Tabela dedicada `public.admins` com função `public.is_admin()` (`SECURITY DEFINER`, `search_path = ''`).
- Revisão mandatória na migration do Épico 3 das policies de `projects`:
  - `projects_authenticated_write` atualizado para `using (public.is_admin()) with check (public.is_admin())`.
  - `projects_authenticated_read` atualizado para `using (public.is_admin())` para evitar que clientes logados vejam projetos ocultos (`visible = false`).

