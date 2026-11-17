// Camada de serviço compartilhada do Servidor MCP do Portfólio (Issue #20)
// Fornece validação de tokens, auditoria, CRUD e proteção SSRF avançada.

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-agent-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const TOOLS_METADATA = [
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
    description: "Cadastra um novo projeto no portfólio com validação estrita de esquema de URLs.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Título do projeto (obrigatório)." },
        description: { type: "string", description: "Descrição do projeto." },
        url: { type: "string", description: "URL de deploy ou site ao vivo (apenas http: ou https:)." },
        github_url: { type: "string", description: "URL do repositório GitHub." },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Lista de tags/tecnologias.",
        },
        image_url: { type: "string", description: "URL da imagem de preview (apenas http: ou https:)." },
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
    description: "Atualiza os campos de um projeto existente com validação de segurança.",
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
    description: "Extrai automaticamente metadados (título, descrição, tags, imagem OpenGraph) com proteção SSRF contra DNS Rebinding e redirects maliciosos.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL do repositório GitHub ou site/demo." },
      },
      required: ["url"],
    },
  },
];

export const REQUIRED_SCOPES = {
  projects_list: "projects:read",
  project_get: "projects:read",
  project_enrich_from_url: "projects:read",
  project_create: "projects:write",
  project_update: "projects:write",
  project_set_visibility: "projects:write",
  project_delete: "projects:delete",
};

export function isPrivateOrRestrictedIp(ip) {
  if (!ip) return true;
  const cleanIp = String(ip).trim().replace(/^\[|\]$/g, '');

  if (cleanIp === '::1' || cleanIp === '0:0:0:0:0:0:0:1') return true;
  if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd') || cleanIp.startsWith('fe80')) return true;

  const match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (match) {
    const [_, o1, o2, o3, o4] = match.map(Number);
    if (o1 === 127) return true; // Loopback 127.0.0.0/8
    if (o1 === 10) return true;  // Private 10.0.0.0/8
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // Private 172.16.0.0/12
    if (o1 === 192 && o2 === 168) return true; // Private 192.168.0.0/16
    if (o1 === 169 && o2 === 254) return true; // Link-local / Cloud Metadata 169.254.0.0/16
    if (o1 === 0) return true;   // 0.0.0.0/8
    if (o1 >= 224) return true;  // Multicast / Reserved 224.0.0.0/4
  }
  return false;
}

export function isPrivateOrRestrictedHost(hostname) {
  if (!hostname) return true;
  const host = String(hostname).toLowerCase().trim();

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }

  if (host === '::1' || host === '[::1]') return true;

  return isPrivateOrRestrictedIp(host);
}

/**
 * Validação segura de esquema de URL para prevenir injeção javascript:, data:, etc.
 */
export function validateSafeUrl(rawUrl, fieldName = 'URL') {
  if (!rawUrl) return null;
  const str = String(rawUrl).trim();
  if (!str) return null;

  if (/^(javascript|vbscript|data):/i.test(str)) {
    throw new Error(`Esquema malicioso proibido no campo '${fieldName}'.`);
  }

  let parsed;
  try {
    parsed = new URL(str);
  } catch {
    throw new Error(`O campo '${fieldName}' contém uma URL malformada.`);
  }

  const allowedProtocols = ['https:', 'http:'];
  if (!allowedProtocols.includes(parsed.protocol)) {
    throw new Error(
      `Protocolo não permitido no campo '${fieldName}': '${parsed.protocol}'. Apenas 'https:' ou 'http:' são aceitos.`
    );
  }

  return parsed.href;
}

/**
 * Valida uma URL contra ataques de SSRF (validação de esquema e hostname).
 */
export function validateUrlForEnrichment(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error('URL inválida ou malformada.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Apenas URLs HTTPS são permitidas por motivos de segurança.');
  }

  if (isPrivateOrRestrictedHost(parsed.hostname)) {
    throw new Error('Acesso a endereços locais ou redes internas é estritamente proibido (SSRF).');
  }

  return parsed;
}

/**
 * Resolução de DNS com verificação de IP (mitigação de DNS Rebinding).
 */
export async function assertSafeDns(hostname, dnsResolver = null) {
  if (isPrivateOrRestrictedHost(hostname)) {
    throw new Error(`Acesso restrito ao host: '${hostname}' (SSRF).`);
  }

  let resolvedIps = [];
  if (dnsResolver) {
    resolvedIps = await dnsResolver(hostname);
  } else if (typeof Deno !== 'undefined' && typeof Deno.resolveDns === 'function') {
    try {
      const a = await Deno.resolveDns(hostname, 'A');
      resolvedIps.push(...a);
    } catch (err) {
      if (err.message && err.message.includes('SSRF')) throw err;
    }
  }

  for (const ip of resolvedIps) {
    if (isPrivateOrRestrictedIp(ip)) {
      throw new Error(`Resolução de DNS detectou IP privado ou restrito '${ip}' para o host '${hostname}' (SSRF/DNS Rebinding).`);
    }
  }
}

/**
 * Calcula o hash SHA-256 de um token em formato hexadecimal.
 */
export async function hashToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token inválido para hashing.');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(token.trim());

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  throw new Error('Ambiente de criptografia indisponível.');
}

export function hasScope(tokenScopes = [], requiredScope) {
  if (!Array.isArray(tokenScopes)) return false;
  if (tokenScopes.includes('*')) return true;
  return tokenScopes.includes(requiredScope);
}

export async function validateAgentToken(supabaseAdmin, rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return { valid: false, error: 'Token de agente ausente.' };
  }

  const tokenClean = rawToken.replace(/^Bearer\s+/i, '').trim();
  if (!tokenClean) {
    return { valid: false, error: 'Token de agente vazio.' };
  }

  const tokenHash = await hashToken(tokenClean);

  const { data: tokenRecord, error } = await supabaseAdmin
    .from('agent_tokens')
    .select('id, agent_name, scopes, expires_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    return { valid: false, error: `Erro ao consultar tokens: ${error.message}` };
  }

  if (!tokenRecord) {
    return { valid: false, error: 'Token de agente não reconhecido ou inexistente.' };
  }

  if (tokenRecord.revoked_at) {
    return { valid: false, error: 'Token de agente foi revogado.' };
  }

  if (tokenRecord.expires_at && new Date(tokenRecord.expires_at) < new Date()) {
    return { valid: false, error: 'Token de agente expirado.' };
  }

  return {
    valid: true,
    agentName: tokenRecord.agent_name,
    tokenId: tokenRecord.id,
    scopes: tokenRecord.scopes || [],
  };
}

export async function recordAgentAudit(supabaseAdmin, {
  agentName,
  tokenId,
  tool,
  args = {},
  result = {},
  status = 'success',
  errorMessage = null,
}) {
  try {
    await supabaseAdmin.from('agent_audit_log').insert({
      agent_name: agentName,
      token_id: tokenId,
      tool,
      args,
      result,
      status,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error('Falha ao registrar auditoria de agente:', err);
  }
}

export async function listProjects(supabaseAdmin, { includeHidden = false, tag = null } = {}) {
  let query = supabaseAdmin
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (!includeHidden) {
    query = query.eq('visible', true);
  }

  if (tag) {
    query = query.contains('tags', [tag]);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Falha ao listar projetos: ${error.message}`);
  return data;
}

export async function getProject(supabaseAdmin, { id }) {
  if (!id) throw new Error('ID do projeto é obrigatório.');
  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Falha ao buscar projeto: ${error.message}`);
  if (!data) throw new Error(`Projeto com ID '${id}' não encontrado.`);
  return data;
}

export async function createProject(supabaseAdmin, projectData) {
  if (!projectData.title || typeof projectData.title !== 'string') {
    throw new Error("O campo 'title' é obrigatório.");
  }

  const payload = {
    title: projectData.title.trim(),
    description: projectData.description ? String(projectData.description).trim() : null,
    url: validateSafeUrl(projectData.url, 'url'),
    github_url: validateSafeUrl(projectData.github_url, 'github_url'),
    tags: Array.isArray(projectData.tags) ? projectData.tags : [],
    image_url: validateSafeUrl(projectData.image_url, 'image_url'),
    visible: typeof projectData.visible === 'boolean' ? projectData.visible : true,
  };

  const { data, error } = await supabaseAdmin
    .from('projects')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(`Falha ao criar projeto: ${error.message}`);
  return data;
}

export async function updateProject(supabaseAdmin, { id, ...updates }) {
  if (!id) throw new Error('ID do projeto é obrigatório para atualização.');

  const payload = {};
  if (updates.title !== undefined) payload.title = updates.title.trim();
  if (updates.description !== undefined) payload.description = updates.description ? updates.description.trim() : null;
  if (updates.url !== undefined) payload.url = validateSafeUrl(updates.url, 'url');
  if (updates.github_url !== undefined) payload.github_url = validateSafeUrl(updates.github_url, 'github_url');
  if (updates.tags !== undefined) payload.tags = Array.isArray(updates.tags) ? updates.tags : [];
  if (updates.image_url !== undefined) payload.image_url = validateSafeUrl(updates.image_url, 'image_url');
  if (updates.visible !== undefined) payload.visible = Boolean(updates.visible);

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao atualizar projeto: ${error.message}`);
  return data;
}

export async function setProjectVisibility(supabaseAdmin, { id, visible }) {
  if (!id) throw new Error('ID do projeto é obrigatório.');
  if (typeof visible !== 'boolean') throw new Error("O campo 'visible' deve ser booleano (true ou false).");

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update({ visible })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Falha ao alterar visibilidade: ${error.message}`);
  return data;
}

export async function deleteProject(supabaseAdmin, { id, confirm }) {
  if (!id) throw new Error('ID do projeto é obrigatório.');
  if (confirm !== true) {
    throw new Error("Exclusão requer confirmação explícita. Passe 'confirm: true' para confirmar a remoção permanente.");
  }

  const { error } = await supabaseAdmin
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Falha ao excluir projeto: ${error.message}`);
  return { success: true, id };
}

/**
 * Enriquecimento com proteção SSRF contra DNS Rebinding e Redirects maliciosos.
 */
export async function enrichFromUrl(rawUrl, { fetchImpl = fetch, dnsResolver = null } = {}) {
  let currentUrl = validateUrlForEnrichment(rawUrl);
  await assertSafeDns(currentUrl.hostname, dnsResolver);

  // 1. Repositório GitHub
  const ghMatch = currentUrl.href.match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\/.*)?$/);
  if (ghMatch) {
    const owner = ghMatch[1];
    const repo = ghMatch[2].replace(/\.git$/i, '');

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
    const res = await fetchImpl(apiUrl, {
      headers: {
        'User-Agent': 'AgLoop-Portfolio-MCP/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });

    if (!res.ok) {
      throw new Error(`Repositório do GitHub não encontrado ou inacessível (HTTP ${res.status}).`);
    }

    const data = await res.json();
    const tags = Array.from(new Set([data.language, ...(data.topics || [])].filter(Boolean)));

    return {
      title: data.name || repo,
      description: data.description || '',
      url: validateSafeUrl(data.homepage || data.html_url, 'url'),
      github_url: validateSafeUrl(data.html_url, 'github_url'),
      tags,
      image_url: validateSafeUrl(`https://opengraph.githubassets.com/1/${owner}/${repo}`, 'image_url'),
    };
  }

  // 2. Website Genérico / Demo com controle manual de redirects (max 3)
  let redirectsCount = 0;
  const MAX_REDIRECTS = 3;
  let res;

  while (redirectsCount <= MAX_REDIRECTS) {
    res = await fetchImpl(currentUrl.href, {
      headers: {
        'User-Agent': 'AgLoop-Portfolio-MCP/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      redirectsCount++;
      if (redirectsCount > MAX_REDIRECTS) {
        throw new Error('Limite de redirecionamentos excedido.');
      }
      const location = res.headers.get('location');
      if (!location) {
        throw new Error('Redirecionamento sem cabeçalho Location.');
      }
      currentUrl = new URL(location, currentUrl.href);
      if (currentUrl.protocol !== 'https:') {
        throw new Error('Redirecionamento para protocolo não HTTPS bloqueado (SSRF).');
      }
      if (isPrivateOrRestrictedHost(currentUrl.hostname)) {
        throw new Error(`Redirecionamento para host restrito ou privado '${currentUrl.hostname}' bloqueado (SSRF).`);
      }
      await assertSafeDns(currentUrl.hostname, dnsResolver);
      continue;
    }

    break;
  }

  if (!res.ok) {
    throw new Error(`Falha ao carregar a página (HTTP ${res.status}).`);
  }

  const reader = res.body?.getReader();
  let html = '';
  let bytesRead = 0;
  const MAX_BYTES = 512 * 1024;

  if (reader) {
    const decoder = new TextDecoder('utf-8');
    while (bytesRead < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break;
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
    title: titleMatch ? titleMatch[1].trim() : currentUrl.hostname,
    description: descMatch ? descMatch[1].trim() : '',
    url: validateSafeUrl(currentUrl.href, 'url'),
    tags: [],
    image_url: imgMatch ? validateSafeUrl(imgMatch[1].trim(), 'image_url') : null,
  };
}

/**
 * Handler puro e completo do protocolo MCP (Stateless HTTP JSON-RPC 2.0).
 */
export async function handleMcpRequest(req, supabase) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método não permitido. Use POST.' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: 'Parse error: JSON inválido.' },
    }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const { id = null, method, params = {} } = body;

  if (method === 'initialize') {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'portfolio-mcp', version: '1.0.0' },
      },
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (method === 'notifications/initialized') {
    return new Response(JSON.stringify({ jsonrpc: '2.0', id, result: {} }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const rawAuth = req.headers.get('x-agent-token') || req.headers.get('authorization') || '';
  const authResult = await validateAgentToken(supabase, rawAuth);

  if (!authResult.valid) {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code: -32000, message: `Não autorizado: ${authResult.error} (HTTP 401).` },
    }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (method === 'tools/list') {
    return new Response(JSON.stringify({
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS_METADATA },
    }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (method === 'tools/call') {
    const toolName = String(params.name || '');
    const toolArgs = params.arguments || {};

    const neededScope = REQUIRED_SCOPES[toolName] || 'projects:write';
    if (!hasScope(authResult.scopes, neededScope)) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32003,
          message: `Acesso negado: o token do agente '${authResult.agentName}' não possui o escopo necessário '${neededScope}' (HTTP 403).`,
        },
      }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const isWriteTool = ['project_create', 'project_update', 'project_set_visibility', 'project_delete'].includes(toolName);

    try {
      let result;
      switch (toolName) {
        case 'projects_list':
          result = await listProjects(supabase, {
            includeHidden: Boolean(toolArgs.include_hidden),
            tag: toolArgs.tag,
          });
          break;
        case 'project_get':
          result = await getProject(supabase, { id: toolArgs.id });
          break;
        case 'project_create':
          result = await createProject(supabase, toolArgs);
          break;
        case 'project_update':
          result = await updateProject(supabase, toolArgs);
          break;
        case 'project_set_visibility':
          result = await setProjectVisibility(supabase, {
            id: toolArgs.id,
            visible: toolArgs.visible,
          });
          break;
        case 'project_delete':
          result = await deleteProject(supabase, {
            id: toolArgs.id,
            confirm: toolArgs.confirm,
          });
          break;
        case 'project_enrich_from_url':
          result = await enrichFromUrl(toolArgs.url);
          break;
        default:
          throw new Error(`Tool desconhecida: '${toolName}'`);
      }

      if (isWriteTool) {
        await recordAgentAudit(supabase, {
          agentName: authResult.agentName,
          tokenId: authResult.tokenId,
          tool: toolName,
          args: toolArgs,
          result,
          status: 'success',
        });
      }

      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: false,
        },
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    } catch (err) {
      if (isWriteTool) {
        await recordAgentAudit(supabase, {
          agentName: authResult.agentName,
          tokenId: authResult.tokenId,
          tool: toolName,
          args: toolArgs,
          result: {},
          status: 'error',
          errorMessage: err.message,
        });
      }

      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: `Erro na execução da tool '${toolName}': ${err.message}` }],
          isError: true,
        },
      }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Método desconhecido: '${method}'.` },
  }), {
    status: 404,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
