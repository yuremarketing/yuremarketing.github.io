// Camada de serviço compartilhada para o Servidor MCP do Portfólio (Issue #20)
// Fornece validação de tokens, controle de escopos, auditoria e operações de projetos.

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

/**
 * Valida se um conjunto de escopos possui a permissão requerida.
 * Suporta o wildcard '*' ou correspondência exata.
 */
export function hasScope(tokenScopes = [], requiredScope) {
  if (!Array.isArray(tokenScopes)) return false;
  if (tokenScopes.includes('*')) return true;
  return tokenScopes.includes(requiredScope);
}

/**
 * Verifica se um IP ou hostname pertence a redes privadas/locais ou metadados de nuvem (SSRF).
 */
export function isPrivateOrRestrictedHost(hostname) {
  if (!hostname) return true;
  const host = hostname.toLowerCase().trim();

  // Hostnames especiais/locais
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }

  // IPv6 loopback
  if (host === '::1' || host === '[::1]') return true;

  // IPv4 regex checks
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = host.match(ipv4Pattern);
  if (match) {
    const [_, o1, o2, o3, o4] = match.map(Number);
    if (o1 === 127) return true; // Loopback 127.0.0.0/8
    if (o1 === 10) return true; // Private 10.0.0.0/8
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // Private 172.16.0.0/12
    if (o1 === 192 && o2 === 168) return true; // Private 192.168.0.0/16
    if (o1 === 169 && o2 === 254) return true; // Link-local / Cloud Metadata 169.254.0.0/16
    if (o1 === 0) return true; // 0.0.0.0/8
  }

  return false;
}

/**
 * Valida uma URL contra ataques de SSRF.
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
 * Valida o token de agente no banco via cliente Supabase (usando service_role).
 */
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

/**
 * Registra uma operação no log de auditoria dos agentes.
 */
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

/**
 * Camada de operações de banco para projetos:
 */
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
    url: projectData.url ? String(projectData.url).trim() : null,
    github_url: projectData.github_url ? String(projectData.github_url).trim() : null,
    tags: Array.isArray(projectData.tags) ? projectData.tags : [],
    image_url: projectData.image_url ? String(projectData.image_url).trim() : null,
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
  if (updates.url !== undefined) payload.url = updates.url ? updates.url.trim() : null;
  if (updates.github_url !== undefined) payload.github_url = updates.github_url ? updates.github_url.trim() : null;
  if (updates.tags !== undefined) payload.tags = Array.isArray(updates.tags) ? updates.tags : [];
  if (updates.image_url !== undefined) payload.image_url = updates.image_url ? updates.image_url.trim() : null;
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
 * Enriquecimento automático a partir de URL pública ou repositório GitHub com proteção SSRF.
 */
export async function enrichFromUrl(rawUrl, fetchImpl = fetch) {
  const parsed = validateUrlForEnrichment(rawUrl);

  // 1. Repositório GitHub
  const ghMatch = parsed.href.match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\/.*)?$/);
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
    });

    if (!res.ok) {
      throw new Error(`Repositório do GitHub não encontrado ou inacessível (HTTP ${res.status}).`);
    }

    const data = await res.json();
    const tags = Array.from(new Set([data.language, ...(data.topics || [])].filter(Boolean)));

    return {
      title: data.name || repo,
      description: data.description || '',
      url: data.homepage || data.html_url,
      github_url: data.html_url,
      tags,
      image_url: `https://opengraph.githubassets.com/1/${owner}/${repo}`,
    };
  }

  // 2. Website Genérico / Demo (HTTPS)
  const res = await fetchImpl(parsed.href, {
    headers: {
      'User-Agent': 'AgLoop-Portfolio-MCP/1.0',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    throw new Error(`Falha ao carregar a página (HTTP ${res.status}).`);
  }

  // Limite de leitura de 512 KB
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

  // Parsing de metatags
  const titleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                     html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const imgMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);

  return {
    title: titleMatch ? titleMatch[1].trim() : parsed.hostname,
    description: descMatch ? descMatch[1].trim() : '',
    url: parsed.href,
    tags: [],
    image_url: imgMatch ? imgMatch[1].trim() : null,
  };
}
