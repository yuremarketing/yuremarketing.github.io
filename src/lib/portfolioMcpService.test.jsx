import { describe, it, expect, vi } from 'vitest';
import {
  hashToken,
  hasScope,
  isPrivateOrRestrictedIp,
  isPrivateOrRestrictedHost,
  validateSafeUrl,
  validateUrlForEnrichment,
  validateAgentToken,
  recordAgentAudit,
  listProjects,
  getProject,
  createProject,
  updateProject,
  setProjectVisibility,
  deleteProject,
  enrichFromUrl,
  handleMcpRequest,
} from './portfolioMcpService';


describe('Serviço MCP e Camada Compartilhada (portfolioMcpService)', () => {
  describe('hashToken', () => {
    it('gera hash SHA-256 consistente de 64 caracteres hexadecimais', async () => {
      const hash1 = await hashToken('mcp_secret_token_123');
      const hash2 = await hashToken('mcp_secret_token_123');
      expect(hash1).toHaveLength(64);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('lança erro se o token for vazio ou inválido', async () => {
      await expect(hashToken('')).rejects.toThrow('Token inválido');
      await expect(hashToken(null)).rejects.toThrow('Token inválido');
    });
  });

  describe('hasScope', () => {
    it('retorna true para escopo exato ou wildcard (*)', () => {
      expect(hasScope(['projects:read', 'projects:write'], 'projects:read')).toBe(true);
      expect(hasScope(['*'], 'projects:delete')).toBe(true);
      expect(hasScope(['projects:read'], 'projects:delete')).toBe(false);
      expect(hasScope([], 'projects:read')).toBe(false);
    });
  });

  describe('Validação de Esquema de URL (Proteção contra XSS)', () => {
    it('permite protocolos seguros http: e https:', () => {
      expect(validateSafeUrl('https://example.com/demo')).toBe('https://example.com/demo');
      expect(validateSafeUrl('http://example.com/demo')).toBe('http://example.com/demo');
    });

    it('rejeita esquemas maliciosos javascript:, vbscript: e data:', () => {
      expect(() => validateSafeUrl('javascript:alert(1)', 'url')).toThrow(/malicioso/);
      expect(() => validateSafeUrl('vbscript:msgbox(1)', 'github_url')).toThrow(/malicioso/);
      expect(() => validateSafeUrl('data:text/html,<script>alert(1)</script>', 'image_url')).toThrow(/malicioso/);
    });

    it('rejeita URLs malformadas ou com esquemas inesperados', () => {
      expect(() => validateSafeUrl('not-a-url', 'url')).toThrow(/malformada/);
      expect(() => validateSafeUrl('ftp://ftp.example.com', 'url')).toThrow(/Protocolo não permitido/);
    });
  });

  describe('Proteção Avançada contra SSRF (IPs, DNS Rebinding e Redirects)', () => {
    it('identifica corretamente IPs privados e de metadados de nuvem', () => {
      expect(isPrivateOrRestrictedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrRestrictedIp('::1')).toBe(true);
      expect(isPrivateOrRestrictedIp('8.8.8.8')).toBe(false);
      expect(isPrivateOrRestrictedIp('140.82.121.4')).toBe(false); // GitHub IP público
    });

    it('identifica hosts restritos', () => {
      expect(isPrivateOrRestrictedHost('localhost')).toBe(true);
      expect(isPrivateOrRestrictedHost('metadata.google.internal')).toBe(true);
      expect(isPrivateOrRestrictedHost('internal.service.local')).toBe(true);
      expect(isPrivateOrRestrictedHost('github.com')).toBe(false);
    });

    it('bloqueia tentativa de DNS Rebinding para IP privado', async () => {
      const mockDnsResolver = vi.fn().mockResolvedValue(['169.254.169.254']);
      await expect(
        enrichFromUrl('https://evil-rebinding.com/steal', {
          fetchImpl: vi.fn(),
          dnsResolver: mockDnsResolver,
        })
      ).rejects.toThrow(/SSRF\/DNS Rebinding/);
    });

    it('bloqueia redirecionamento para protocolo não HTTPS ou host privado', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        status: 302,
        headers: new Headers({
          location: 'http://169.254.169.254/latest/meta-data/',
        }),
      });

      await expect(
        enrichFromUrl('https://legit-site.com/redirect', {
          fetchImpl: mockFetch,
          dnsResolver: vi.fn().mockResolvedValue(['93.184.216.34']),
        })
      ).rejects.toThrow(/não HTTPS bloqueado/);
    });
  });

  describe('validateAgentToken', () => {
    it('rejeita token ausente ou vazio', async () => {
      const res = await validateAgentToken({}, null);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/ausente/);
    });

    it('rejeita token inexistente', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      };

      const res = await validateAgentToken(mockSupabase, 'Bearer token_inexistente');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/não reconhecido/);
    });

    it('rejeita token revogado', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'tok-1',
                  agent_name: 'Claude',
                  scopes: ['projects:read'],
                  revoked_at: '2026-11-17T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const res = await validateAgentToken(mockSupabase, 'Bearer token_revogado');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/revogado/);
    });

    it('rejeita token expirado', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'tok-2',
                  agent_name: 'Gemini',
                  scopes: ['projects:read'],
                  expires_at: '2020-01-01T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const res = await validateAgentToken(mockSupabase, 'Bearer token_expirado');
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/expirado/);
    });

    it('valida com sucesso token ativo com escopos', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'tok-3',
                  agent_name: 'Gemini',
                  scopes: ['projects:read', 'projects:write'],
                  expires_at: '2099-01-01T00:00:00Z',
                  revoked_at: null,
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const res = await validateAgentToken(mockSupabase, 'Bearer token_valido');
      expect(res.valid).toBe(true);
      expect(res.agentName).toBe('Gemini');
      expect(res.scopes).toEqual(['projects:read', 'projects:write']);
    });
  });

  describe('Operações de Projetos com Validação de Segurança', () => {
    it('createProject rejeita URL maliciosa (javascript:) nos links', async () => {
      await expect(
        createProject({}, { title: 'XSS Attack', url: 'javascript:alert(document.cookie)' })
      ).rejects.toThrow(/malicioso/);
    });

    it('createProject cadastra projeto válido formatado', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: () => ({
          single: async () => ({ data: { id: 'p-1', title: 'Meu Projeto' }, error: null }),
        }),
      });
      const mockSupabase = { from: () => ({ insert: mockInsert }) };

      const res = await createProject(mockSupabase, {
        title: ' Meu Projeto ',
        description: ' Descrição ',
        url: 'https://demo.com',
        tags: ['React'],
      });

      expect(res.id).toBe('p-1');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          title: 'Meu Projeto',
          url: 'https://demo.com/',
          visible: true,
        }),
      ]);
    });

    it('deleteProject exige confirm: true para autorizar exclusão', async () => {
      await expect(deleteProject({}, { id: 'p-1', confirm: false })).rejects.toThrow(/confirmação/);
      const mockDelete = vi.fn().mockReturnValue({
        eq: async () => ({ error: null }),
      });
      const res = await deleteProject({ from: () => ({ delete: mockDelete }) }, { id: 'p-1', confirm: true });
      expect(res.success).toBe(true);
    });
  });

  describe('handleMcpRequest (Handler Real da Edge Function index.ts)', () => {
    it('responde a initialize com capabilities de tools e protocolo 2024-11-05', async () => {
      const req = new Request('https://edge.supabase.co/functions/v1/portfolio-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize' }),
      });

      const res = await handleMcpRequest(req, {});
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result.protocolVersion).toBe('2024-11-05');
      expect(json.result.serverInfo.name).toBe('portfolio-mcp');
    });

    it('retorna HTTP 401 se tentar invocar tools sem token', async () => {
      const req = new Request('https://edge.supabase.co/functions/v1/portfolio-mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'projects_list' },
        }),
      });

      const res = await handleMcpRequest(req, {});
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.message).toMatch(/Não autorizado/);
    });

    it('retorna HTTP 403 se o agente não possuir o escopo necessário', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'tok-reader',
                  agent_name: 'Claude',
                  scopes: ['projects:read'],
                },
                error: null,
              }),
            }),
          }),
        }),
      };

      const req = new Request('https://edge.supabase.co/functions/v1/portfolio-mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-agent-token': 'token_reader_only',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'project_delete', arguments: { id: 'p-1', confirm: true } },
        }),
      });

      const res = await handleMcpRequest(req, mockSupabase);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error.message).toMatch(/projects:delete/);
    });
  });
});
