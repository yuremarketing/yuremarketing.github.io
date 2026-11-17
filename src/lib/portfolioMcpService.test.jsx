import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hashToken,
  hasScope,
  isPrivateOrRestrictedHost,
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
} from './portfolioMcpService';

describe('portfolioMcpService', () => {
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

  describe('SSRF Protection & URL Validation', () => {
    it('detecta hosts restritos e privados', () => {
      expect(isPrivateOrRestrictedHost('localhost')).toBe(true);
      expect(isPrivateOrRestrictedHost('127.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedHost('10.0.0.5')).toBe(true);
      expect(isPrivateOrRestrictedHost('172.16.0.1')).toBe(true);
      expect(isPrivateOrRestrictedHost('192.168.1.100')).toBe(true);
      expect(isPrivateOrRestrictedHost('169.254.169.254')).toBe(true);
      expect(isPrivateOrRestrictedHost('::1')).toBe(true);
      expect(isPrivateOrRestrictedHost('internal.service.local')).toBe(true);
      expect(isPrivateOrRestrictedHost('metadata.google.internal')).toBe(true);

      // Hosts públicos permitidos
      expect(isPrivateOrRestrictedHost('github.com')).toBe(false);
      expect(isPrivateOrRestrictedHost('example.com')).toBe(false);
      expect(isPrivateOrRestrictedHost('api.github.com')).toBe(false);
    });

    it('rejeita URLs HTTP não seguras e IPs privados', () => {
      expect(() => validateUrlForEnrichment('http://github.com/repo')).toThrow(/HTTPS/);
      expect(() => validateUrlForEnrichment('https://127.0.0.1:8080')).toThrow(/SSRF/);
      expect(() => validateUrlForEnrichment('https://localhost/admin')).toThrow(/SSRF/);
      expect(() => validateUrlForEnrichment('not-a-url')).toThrow(/inválida/);

      const valid = validateUrlForEnrichment('https://github.com/yuremarketing/portfolio');
      expect(valid.hostname).toBe('github.com');
    });
  });

  describe('validateAgentToken', () => {
    it('rejeita token ausente ou vazio', async () => {
      const res = await validateAgentToken({}, null);
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/ausente/);
    });

    it('rejeita token não existente no banco', async () => {
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

  describe('Operações de Projetos (CRUD)', () => {
    it('createProject valida título obrigatório e formata payload', async () => {
      await expect(createProject({}, {})).rejects.toThrow("O campo 'title' é obrigatório.");

      const mockInsert = vi.fn().mockReturnValue({
        select: () => ({
          single: async () => ({ data: { id: 'p-1', title: 'Meu Projeto' }, error: null }),
        }),
      });
      const mockSupabase = { from: () => ({ insert: mockInsert }) };

      const res = await createProject(mockSupabase, {
        title: ' Meu Projeto ',
        description: ' Descrição ',
        tags: ['React', 'Node'],
      });

      expect(res.id).toBe('p-1');
      expect(mockInsert).toHaveBeenCalledWith([
        expect.objectContaining({
          title: 'Meu Projeto',
          description: 'Descrição',
          tags: ['React', 'Node'],
          visible: true,
        }),
      ]);
    });

    it('setProjectVisibility exige booleano e atualiza projeto', async () => {
      await expect(setProjectVisibility({}, { id: 'p-1', visible: 'sim' })).rejects.toThrow(/booleano/);

      const mockUpdate = vi.fn().mockReturnValue({
        eq: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'p-1', visible: false }, error: null }),
          }),
        }),
      });
      const mockSupabase = { from: () => ({ update: mockUpdate }) };

      const res = await setProjectVisibility(mockSupabase, { id: 'p-1', visible: false });
      expect(res.visible).toBe(false);
      expect(mockUpdate).toHaveBeenCalledWith({ visible: false });
    });

    it('deleteProject exige confirm: true para autorizar exclusão', async () => {
      await expect(deleteProject({}, { id: 'p-1', confirm: false })).rejects.toThrow(/confirmação/);
      await expect(deleteProject({}, { id: 'p-1' })).rejects.toThrow(/confirmação/);

      const mockDelete = vi.fn().mockReturnValue({
        eq: async () => ({ error: null }),
      });
      const mockSupabase = { from: () => ({ delete: mockDelete }) };

      const res = await deleteProject(mockSupabase, { id: 'p-1', confirm: true });
      expect(res.success).toBe(true);
      expect(res.id).toBe('p-1');
    });
  });

  describe('enrichFromUrl', () => {
    it('extrai dados enriquecidos de um repositório GitHub', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          name: 'super-portfolio',
          description: 'Portfólio moderno em React',
          html_url: 'https://github.com/yuremarketing/super-portfolio',
          homepage: 'https://yuremarketing.github.io',
          language: 'JavaScript',
          topics: ['react', 'portfolio', 'vite'],
        }),
      });

      const data = await enrichFromUrl('https://github.com/yuremarketing/super-portfolio', mockFetch);
      expect(data.title).toBe('super-portfolio');
      expect(data.description).toBe('Portfólio moderno em React');
      expect(data.url).toBe('https://yuremarketing.github.io');
      expect(data.github_url).toBe('https://github.com/yuremarketing/super-portfolio');
      expect(data.tags).toContain('JavaScript');
      expect(data.tags).toContain('react');
      expect(data.image_url).toContain('opengraph.githubassets.com');
    });

    it('rejeita tentativa de SSRF para rede interna', async () => {
      await expect(enrichFromUrl('https://127.0.0.1:8000/api')).rejects.toThrow(/SSRF/);
    });
  });

  describe('recordAgentAudit', () => {
    it('insere registro em agent_audit_log', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      const mockSupabase = { from: () => ({ insert: mockInsert }) };

      await recordAgentAudit(mockSupabase, {
        agentName: 'Claude',
        tokenId: 'tok-1',
        tool: 'project_create',
        args: { title: 'Novo Projeto' },
        result: { id: 'p-new' },
        status: 'success',
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_name: 'Claude',
          token_id: 'tok-1',
          tool: 'project_create',
          status: 'success',
        })
      );
    });
  });
});
