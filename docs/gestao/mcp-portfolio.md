# Servidor MCP do Portfólio (Issue #20)

O **Servidor MCP do Portfólio** expõe as operações de gerenciamento de projetos da vitrine para as LLMs do AgLoop (Claude, Gemini, Codex, Cursor, etc.) via protocolo **Model Context Protocol (MCP)**, eliminando a necessidade de automação de interface visual ou cópia/cola manual pelo PO.

---

## 🏗️ 1. Arquitetura

- **Hospedagem:** Supabase Edge Function (`supabase/functions/portfolio-mcp`).
- **Transporte:** **Stateless HTTP (JSON-RPC 2.0)**. Cada requisição POST executa uma operação isolada, eliminando fragilidades de conexões persistentes (SSE/WebSockets) na infraestrutura serverless (Deno Deploy).
- **Segurança de Acesso:** A `service_role` key opera exclusivamente no ambiente isolado da Edge Function; os agentes utilizam tokens Bearer revogáveis e com escopos limitados.
- **Proteção contra SSRF:** A ferramenta `project_enrich_from_url` valida estritamente URLs HTTPS públicas, consome repositórios via API oficial do GitHub e bloqueia acessos a loopback, redes locais e metadados de nuvem.

---

## 🛠️ 2. Ferramentas (Tools) Disponíveis

| Tool | Escopo Necessário | Descrição | Parâmetros Principais |
| :--- | :--- | :--- | :--- |
| `projects_list` | `projects:read` | Lista os projetos da vitrine. | `include_hidden` (boolean), `tag` (string) |
| `project_get` | `projects:read` | Obtém os dados completos de um projeto. | `id` (uuid) |
| `project_enrich_from_url` | `projects:read` | Extrai título, descrição, tags e imagem OpenGraph de repositório GitHub ou site. | `url` (string HTTPS) |
| `project_create` | `projects:write` | Cadastra um novo projeto na vitrine. | `title` (obrigatório), `description`, `url`, `github_url`, `tags`, `image_url`, `visible` |
| `project_update` | `projects:write` | Atualiza campos de um projeto existente. | `id` (obrigatório), campos a atualizar |
| `project_set_visibility` | `projects:write` | Altera a visibilidade pública (ocultar/exibir). | `id`, `visible` (boolean) |
| `project_delete` | `projects:delete` | Remove permanentemente um projeto. | `id`, `confirm: true` (obrigatório) |

---

## 🔐 3. Gestão de Tokens e Permissões

### Escopos de Acesso
- `projects:read`: Permite listagem, consulta e enriquecimento de URLs.
- `projects:write`: Permite criação, edição e alteração de visibilidade.
- `projects:delete`: Permite exclusão permanente de projetos (segregado de escrita).
- `*`: Superagente / Acesso completo.

### Gerando Token para um Agente (Apenas Admin / PO)
Execute no Editor SQL do Supabase (com o usuário admin autenticado):

```sql
-- Exemplo: Emite token para o agente Claude com escopos de leitura e escrita
select public.create_agent_token(
  p_agent_name => 'Claude',
  p_scopes => array['projects:read', 'projects:write'],
  p_description => 'Token de produção do Claude Code',
  p_expires_days => 90
);
```

> [!IMPORTANT]
> O token em texto puro (`mcp_agloop_...`) é retornado **uma única vez**. Apenas o seu hash SHA-256 é armazenado na tabela `agent_tokens`. Nunca compartilhe ou versione o token.

---

## ⚙️ 4. Configuração nos Clientes de IA

### A. Claude Code CLI (`.mcp.json`)
Adicione ao arquivo `.mcp.json` do seu ambiente (ou via flag de execução), mantendo o token via variável de ambiente:

```json
{
  "mcpServers": {
    "portfolio": {
      "type": "http",
      "url": "https://<PROJECT-REF>.supabase.co/functions/v1/portfolio-mcp",
      "headers": {
        "x-agent-token": "${PORTFOLIO_MCP_TOKEN}"
      }
    }
  }
}
```

### B. Gemini / Antigravity / Google AI Studio
Nas configurações de MCP Tools do agente:
- **Server URL:** `https://<PROJECT-REF>.supabase.co/functions/v1/portfolio-mcp`
- **Transport:** HTTP / JSON-RPC
- **Header:** `Authorization: Bearer <SEU_TOKEN_AQUI>`

### C. Cursor / Windsurf
Em `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "portfolio-mcp": {
      "url": "https://<PROJECT-REF>.supabase.co/functions/v1/portfolio-mcp",
      "headers": {
        "x-agent-token": "${PORTFOLIO_MCP_TOKEN}"
      }
    }
  }
}
```

---

## 📜 5. Auditoria de Operações (`agent_audit_log`)

Toda chamada de escrita (`project_create`, `project_update`, `project_set_visibility`, `project_delete`) gera um registro detalhado na tabela `public.agent_audit_log` contendo:
- `agent_name`: Nome do agente que executou a ação (conforme `docs/gestao/roster-agentes.md`).
- `token_id`: Identificador do token utilizado.
- `tool`: Nome da ferramenta invocada.
- `args`: Argumentos fornecidos na chamada.
- `result`: Resposta retornada ou dados criados.
- `status`: `success` ou `error`.
- `created_at`: Data e hora da operação.
