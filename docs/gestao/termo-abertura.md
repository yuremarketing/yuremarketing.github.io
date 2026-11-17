# Termo de Abertura do Projeto (Project Charter) — Portfólio Dinâmico e Gerenciável

Documento executivo de governança do projeto de Portfólio do Yure Mark. A execução contínua segue o protocolo de turnos documentado em `.claude/skills/vigilia/SKILL.md` e `AGENTS.md`.

---

## 1. Identificação

- **Projeto:** Portfólio Dinâmico e Gerenciável
- **Product Owner (PO):** Yure Mark
- **Agentes de Engenharia (Dev Team / Tech Lead):** Claude & Gemini (Antigravity)
- **Repositório:** `https://github.com/yuremarketing/yuremarketing.github.io`

---

## 2. Justificativa & Visão

- **Problema:** Recrutadores e clientes não tinham um lugar centralizado, moderno e profissional para avaliar rapidamente os projetos, histórico profissional e capacidade técnica do Yure sem necessidade de intervenção manual frequente no código.
- **Público-Alvo:** Recrutadores técnicos, gestores de contratação e clientes em potencial para projetos freelance e consultoria.
- **Critério de Sucesso:** Volume de contatos recebidos originados pelo portfólio, agilidade no gerenciamento de projetos e conversão de orçamentos através da Área do Cliente.

---

## 3. Escopo Macro

1. **Épico 1 — Vitrine de Projetos (Concluído):**
   - Catálogo gerenciável de projetos via painel administrativo (`/admin`) integrado ao Supabase.
   - Suporte a edição, exclusão e toggle de visibilidade (`visible`).
2. **Épico 2 — Assistente de IA no Portfólio (Concluído):**
   - Widget de chat interativo com IA integrado via Supabase Edge Function e API do Google Gemini.
   - Conformidade com LGPD (consentimento explícito, dados em memória).
3. **Épico 3 — Área Privada do Cliente (Concluído):**
   - Autenticação sem senha via Magic Link (`/portal`).
   - Solicitação de orçamentos, thread de mensagens 1:1 e upload seguro de briefings/fotos para bucket privado (`client-assets`).
   - Visão consolidada de demandas no painel administrativo do Yure (`/admin`).

---

## 4. Stakeholders e Papéis

| Papel | Responsável | Responsabilidades |
| :--- | :--- | :--- |
| **Product Owner (PO)** | Yure Mark | Decisões finais de produto, priorização do backlog e aprovação exclusiva de código de produção. |
| **Dev Especialista (Rotativo)** | Claude ou Gemini | Proposição técnica, implementação e garantia de testes verdes. |
| **Tech Lead (Rotativo)** | Claude ou Gemini | Auditoria crítica (máx. 3 rodadas), verificação de segurança/RLS e homologação. |
| **Observador** | Claude-Cloud | Acompanhamento e suporte passivo. |

---

## 5. Restrições e Cláusula Pétrea

- **Cláusula Pétrea:** Nenhuma alteração em código de produção é commitada na branch `main` sem aprovação explícita do PO (Yure Mark).
- **Docker First:** Todo o ambiente de desenvolvimento, build e testes roda isolado em containers Docker (`.agents/AGENTS.md`).
- **Debate Estruturado:** Ciclo de turnos no `war_room.md` limitado a Proposta → Réplica → Tréplica.
