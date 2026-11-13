# Backlog de Produto

## Visão
- **Problema:** recrutadores e clientes não têm hoje um lugar centralizado e profissional pra avaliar rapidamente os projetos e a experiência do Yure.
- **Público:** recrutadores técnicos / gestores de contratação, e clientes em potencial (freelance/consultoria).
- **Sucesso:** nº de contatos recebidos (via formulário ou LinkedIn) originados pelo portfólio.

## Épico 1 — Vitrine de Projetos · Status: Planejado

### User Story 1.1
Como recrutador, quero ver rapidamente os projetos mais relevantes do Yure com contexto técnico (stack, problema resolvido, resultado), para decidir se ele é fit pra vaga sem precisar pedir mais informação.

**Critérios de aceite:**
- Lista de projetos visível na home, sem precisar navegar mais de 1 clique.
- Cada projeto mostra: nome, descrição curta, stack usada e link (demo e/ou repositório).
- Lighthouse Performance Score ≥ 0.90 em mobile, FCP ≤ 1.5s e LCP ≤ 3.0s sob perfil simulado Slow 4G (ou ≤ 2.0s em rede 4G convencional).

## Épico 2 — Assistente de IA no Portfólio · Status: Planejado (US 2.1 detalhada, bloqueada para desenvolvimento até aprovação do PO)

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

## Épico 3 — Área Privada Cliente/Visitante · Status: Ideia (não detalhado)

Visitante cadastrado tem acesso a uma tela privada de interação 1:1 com o Yure: orçamentos, troca de arquivos e fotos.

⚠️ Amplia a superfície de dados pessoais (arquivos, dados de orçamento) e exige controle de acesso rígido (um visitante não pode ver dados de outro). Precisa de brainstorm/detalhamento próprio antes de entrar no roadmap — autenticação/autorização por registro, onde e por quanto tempo armazenar arquivos, e se orçamento conta como dado sensível. Ver R02 na matriz de riscos.
