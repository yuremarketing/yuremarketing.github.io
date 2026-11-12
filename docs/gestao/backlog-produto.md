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
- Página carrega em até 2s em conexão 4G.

## Épico 2 — Assistente de IA no Portfólio · Status: Planejado (brainstorm concluído, sem user story detalhada)

Visitante se cadastra (nome + e-mail, ou login via LinkedIn OAuth) e conversa com uma LLM que responde sobre o Yure e seus projetos.

**Pontos do brainstorm:**
- Conversa não persiste por padrão; e-mail de cadastro retido só enquanto necessário pro contato.
- Consentimento explícito obrigatório (checkbox não pré-marcado) no cadastro.
- Se usar LLM via API externa, o conteúdo da conversa sai do servidor — precisa constar na política de privacidade.

⚠️ Depende de mapa de dados pessoais + política de privacidade (ver R01 na matriz de riscos).

## Épico 3 — Área Privada Cliente/Visitante · Status: Ideia (não detalhado)

Visitante cadastrado tem acesso a uma tela privada de interação 1:1 com o Yure: orçamentos, troca de arquivos e fotos.

⚠️ Amplia a superfície de dados pessoais (arquivos, dados de orçamento) e exige controle de acesso rígido (um visitante não pode ver dados de outro). Precisa de brainstorm/detalhamento próprio antes de entrar no roadmap — autenticação/autorização por registro, onde e por quanto tempo armazenar arquivos, e se orçamento conta como dado sensível. Ver R02 na matriz de riscos.
