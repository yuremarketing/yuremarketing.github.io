// Supabase Edge Function (Deno): Servidor MCP do Portfólio (Issue #20)
// Fornece transporte Stateless HTTP (JSON-RPC 2.0) para agentes AgLoop operarem o portfólio.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// 1. Criptografia & Tokens
// ---------------------------------------------------------------------------
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hasScope(tokenScopes: string[] = [], requiredScope: string): boolean {
  if (tokenScopes.includes("*")) return true;
  return tokenScopes.includes(requiredScope);
}

// ---------------------------------------------------------------------------
// 2. Proteção SSRF
// ---------------------------------------------------------------------------
function isPrivateOrRestrictedHost(hostname: string): boolean {
  if (!hostname) return true;
  const host = hostname.toLowerCase().trim();

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  if (host === "::1" || host === "[::1]") return true;

  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Pattern);
  if (match) {
    const [_, o1, o2] = match.map(Number);
    if (o1 === 127) return true; // Loopback
    if (o1 === 10) return true; // 10.0.0.0/8
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12
    if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16
    if (o1 === 169 && o2 === 254) return true; // Link-local / Cloud Metadata
    if (o1 === 0) return true;
  }

  return false;
}

function validateUrlForEnrichment(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida ou malformada.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Apenas URLs HTTPS são permitidas por motivos de segurança.");
  }

  if (isPrivateOrRestrictedHost(parsed.hostname)) {
    throw new Error("Acesso a endereços locais ou redes internas é estritamente proibido (SSRF).");
  }

  return parsed;
}

// ---------------------------------------------------------------------------
// 3. Ferramentas Disponíveis (MCP Tool Definitions)
// ---------------------------------------------------------------------------
const TOOLS_METADATA = [
  {
    name: "projects_list",
    description: "Lista projetos cadastrados no portfólio. Permite filtrar por visibilidade e tag.",
    inputSchema: {
      type: "object",
      properties: {
        include_hidden: {
          type: "boolean",
          description: "Se true, inclui projetos ocultos na listagem (requer privilégio de agente).",
        },
        tag: {
          type: "string",
          description: "Filtra projetos por uma tag específica.",
        },
      },
    },
  },
  {
    name: "project_get",
    description: "Obtém detalhes completos de um projeto pelo seu UUID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID do projeto." },
      },
      required: ["id"],
    },
  },
  {
    name: "project_create",
    description: "Cadastra um novo projeto no portfólio.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título do projeto (obrigatório)." },
        description: { type: "string", description: "Descrição do projeto." },
        url: { type: "string", description: "URL de deploy ou site ao vivo." },
        github_url: { type: "string", description: "URL do repositório GitHub." },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Lista de tags/tecnologias.",
        },
        image_url: { type: "string", description: "URL da imagem de preview." },
        visible: {
          type: "boolean",
          description: "Define se o projeto é exibido na vitrine pública (padrão: true).",
        },
      },
      required: ["title"],
    },
  },
  {
    name: "project_update",
    description: "Atualiza os campos de um projeto existente.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID do projeto a ser atualizado." },
        title: { type: "string", description: "Novo título." },
        description: { type: "string", description: "Nova descrição." },
        url: { type: "string", description: "Nova URL do site." },
        github_url: { type: "string", description: "Nova URL do GitHub." },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Novas tags.",
        },
        image_url: { type: "string", description: "Nova imagem." },
        visible: { type: "boolean", description: "Nova visibilidade pública." },
      },
      required: ["id"],
    },
  },
  {
    name: "project_set_visibility",
    description: "Oculta ou exibe um projeto na vitrine pública.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID do projeto." },
        visible: { type: "boolean", description: "true para exibir, false para ocultar." },
      },
      required: ["id", "visible"],
    },
  },
  {
    name: "project_delete",
    description: "Exclui permanentemente um projeto. Exige escopo 'projects:delete' e parâmetro confirm: true.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "UUID do projeto a excluir." },
        confirm: {
          type: "boolean",
          description: "Confirmação explícita de exclusão. Deve ser true.",
        },
      },
      required: ["id", "confirm"],
    },
  },
  {
    name: "project_enrich_from_url",
    description: "Extrai automaticamente metadados (título, descrição, tags, imagem OpenGraph) a partir de uma URL de repositório GitHub ou site público HTTPS com proteção SSRF.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL do repositório GitHub ou site/demo." },
      },
      required: ["url"],
    },
  },
];

// ---------------------------------------------------------------------------
// 4. Execução de Tools
// ---------------------------------------------------------------------------
async function executeTool(
  supabase: any,
  toolName: string,
  args: Record<string, any>
) {
  switch (toolName) {
    case "projects_list": {
      let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
      if (!args.include_hidden) {
        query = query.eq("visible", true);
      }
      if (args.tag) {
        query = query.contains("tags", [args.tag]);
      }
      const { data, error } = await query;
      if (error) throw new Error(`Erro ao listar projetos: ${error.message}`);
      return data;
    }

    case "project_get": {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", args.id)
        .maybeSingle();
      if (error) throw new Error(`Erro ao buscar projeto: ${error.message}`);
      if (!data) throw new Error(`Projeto com id '${args.id}' não encontrado.`);
      return data;
    }

    case "project_create": {
      if (!args.title || typeof args.title !== "string") {
        throw new Error("O campo 'title' é obrigatório.");
      }
      const payload = {
        title: args.title.trim(),
        description: args.description ? String(args.description).trim() : null,
        url: args.url ? String(args.url).trim() : null,
        github_url: args.github_url ? String(args.github_url).trim() : null,
        tags: Array.isArray(args.tags) ? args.tags : [],
        image_url: args.image_url ? String(args.image_url).trim() : null,
        visible: typeof args.visible === "boolean" ? args.visible : true,
      };
      const { data, error } = await supabase
        .from("projects")
        .insert([payload])
        .select()
        .single();
      if (error) throw new Error(`Erro ao criar projeto: ${error.message}`);
      return data;
    }

    case "project_update": {
      if (!args.id) throw new Error("ID do projeto é obrigatório.");
      const payload: Record<string, any> = {};
      if (args.title !== undefined) payload.title = String(args.title).trim();
      if (args.description !== undefined) payload.description = args.description ? String(args.description).trim() : null;
      if (args.url !== undefined) payload.url = args.url ? String(args.url).trim() : null;
      if (args.github_url !== undefined) payload.github_url = args.github_url ? String(args.github_url).trim() : null;
      if (args.tags !== undefined) payload.tags = Array.isArray(args.tags) ? args.tags : [];
      if (args.image_url !== undefined) payload.image_url = args.image_url ? String(args.image_url).trim() : null;
      if (args.visible !== undefined) payload.visible = Boolean(args.visible);

      const { data, error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw new Error(`Erro ao atualizar projeto: ${error.message}`);
      return data;
    }

    case "project_set_visibility": {
      if (!args.id) throw new Error("ID do projeto é obrigatório.");
      if (typeof args.visible !== "boolean") throw new Error("O campo 'visible' deve ser booleano.");
      const { data, error } = await supabase
        .from("projects")
        .update({ visible: args.visible })
        .eq("id", args.id)
        .select()
        .single();
      if (error) throw new Error(`Erro ao alterar visibilidade: ${error.message}`);
      return data;
    }

    case "project_delete": {
      if (!args.id) throw new Error("ID do projeto é obrigatório.");
      if (args.confirm !== true) {
        throw new Error("Exclusão requer confirmação explícita com 'confirm: true'.");
      }
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", args.id);
      if (error) throw new Error(`Erro ao excluir projeto: ${error.message}`);
      return { success: true, id: args.id };
    }

    case "project_enrich_from_url": {
      if (!args.url || typeof args.url !== "string") {
        throw new Error("O campo 'url' é obrigatório.");
      }
      const parsed = validateUrlForEnrichment(args.url);

      // GitHub Repository
      const ghMatch = parsed.href.match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\/.*)?$/);
      if (ghMatch) {
        const owner = ghMatch[1];
        const repo = ghMatch[2].replace(/\.git$/i, "");
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            "User-Agent": "AgLoop-Portfolio-MCP/1.0",
            Accept: "application/vnd.github.v3+json",
          },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
          throw new Error(`Repositório GitHub inacessível (HTTP ${res.status}).`);
        }
        const data = await res.json();
        const tags = Array.from(new Set([data.language, ...(data.topics || [])].filter(Boolean)));
        return {
          title: data.name || repo,
          description: data.description || "",
          url: data.homepage || data.html_url,
          github_url: data.html_url,
          tags,
          image_url: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
        };
      }

      // Generic Web URL
      const res = await fetch(parsed.href, {
        headers: {
          "User-Agent": "AgLoop-Portfolio-MCP/1.0",
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        throw new Error(`Falha ao acessar website (HTTP ${res.status}).`);
      }

      const reader = res.body?.getReader();
      let html = "";
      let bytesRead = 0;
      const MAX_BYTES = 512 * 1024;
      if (reader) {
        const decoder = new TextDecoder("utf-8");
        while (bytesRead < MAX_BYTES) {
          const { done, value } = await reader.read();
          if (done) break;
          bytesRead += value.byteLength;
          html += decoder.decode(value, { stream: true });
          if (html.includes("</head>")) break;
        }
      } else {
        html = await res.text();
      }

      const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                         html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
      const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

      return {
        title: titleMatch ? titleMatch[1].trim() : parsed.hostname,
        description: descMatch ? descMatch[1].trim() : "",
        url: parsed.href,
        tags: [],
        image_url: imgMatch ? imgMatch[1].trim() : null,
      };
    }

    default:
      throw new Error(`Tool desconhecida: '${toolName}'`);
  }
}

// ---------------------------------------------------------------------------
// 5. Handler Principal HTTP
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido. Use POST." }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Serviço mal configurado no servidor (chaves ausentes)." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  let body: JsonRpcRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32700, message: "Parse error: JSON inválido." },
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { id = null, method, params = {} } = body;

  // Handlers de inicialização
  if (method === "initialize") {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "portfolio-mcp",
          version: "1.0.0",
        },
      },
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (method === "notifications/initialized") {
    return new Response(JSON.stringify({ jsonrpc: "2.0", id, result: {} }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Autenticação de Agente
  const rawAuth = req.headers.get("x-agent-token") || req.headers.get("authorization") || "";
  const token = rawAuth.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: "Não autorizado: token de agente ausente (HTTP 401)." },
    }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const tokenHash = await hashToken(token);
  const { data: agentToken, error: tokenError } = await supabase
    .from("agent_tokens")
    .select("id, agent_name, scopes, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError || !agentToken) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: "Não autorizado: token de agente inválido ou não encontrado (HTTP 401)." },
    }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (agentToken.revoked_at) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: "Não autorizado: token de agente revogado (HTTP 401)." },
    }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  if (agentToken.expires_at && new Date(agentToken.expires_at) < new Date()) {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message: "Não autorizado: token de agente expirado (HTTP 401)." },
    }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const agentScopes = agentToken.scopes || [];

  // tools/list
  if (method === "tools/list") {
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS_METADATA,
      },
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // tools/call
  if (method === "tools/call") {
    const toolName = String(params.name || "");
    const toolArgs = (params.arguments as Record<string, any>) || {};

    // Verificação de Escopos
    const REQUIRED_SCOPES: Record<string, string> = {
      projects_list: "projects:read",
      project_get: "projects:read",
      project_enrich_from_url: "projects:read",
      project_create: "projects:write",
      project_update: "projects:write",
      project_set_visibility: "projects:write",
      project_delete: "projects:delete",
    };

    const neededScope = REQUIRED_SCOPES[toolName] || "projects:write";
    if (!hasScope(agentScopes, neededScope)) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32003,
          message: `Acesso negado: o token do agente '${agentToken.agent_name}' não possui o escopo necessário '${neededScope}' (HTTP 403).`,
        },
      }), {
        status: 403,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const isWriteTool = ["project_create", "project_update", "project_set_visibility", "project_delete"].includes(toolName);

    try {
      const result = await executeTool(supabase, toolName, toolArgs);

      // Auditoria de operações de escrita
      if (isWriteTool) {
        await supabase.from("agent_audit_log").insert({
          agent_name: agentToken.agent_name,
          token_id: agentToken.id,
          tool: toolName,
          args: toolArgs,
          result,
          status: "success",
        });
      }

      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
          isError: false,
        },
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (err: any) {
      if (isWriteTool) {
        await supabase.from("agent_audit_log").insert({
          agent_name: agentToken.agent_name,
          token_id: agentToken.id,
          tool: toolName,
          args: toolArgs,
          result: {},
          status: "error",
          error_message: err.message,
        });
      }

      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id,
        result: {
          content: [
            {
              type: "text",
              text: `Erro na execução da tool '${toolName}': ${err.message}`,
            },
          ],
          isError: true,
        },
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }

  // Método não suportado
  return new Response(JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code: -32601, message: `Método desconhecido: '${method}'.` },
  }), {
    status: 404,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
