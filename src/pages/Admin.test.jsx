import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Admin } from './Admin';
import { supabase } from '../lib/supabase';

// Mock do módulo supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

const ADMIN_USER = { id: 'admin-1', email: 'yure.mark@gmail.com' };
const MOCK_REQUEST = {
  id: 'req-1',
  user_id: 'client-user-123456',
  status: 'pending',
  created_at: '2026-01-01T00:00:00Z',
  budget_estimate: null,
};

const renderAdmin = () => render(<MemoryRouter><Admin /></MemoryRouter>);

describe('Admin Component (Painel Administrativo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  });

  it('renderiza o formulário de login quando deslogado', async () => {
    renderAdmin();

    expect(screen.getByText(/Painel Administrativo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/E-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
  });

  it('bloqueia o acesso para usuário autenticado sem privilégio de admin', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'u1', email: 'naoadmin@exemplo.com' } } },
    });
    supabase.from.mockImplementation((table) => {
      if (table === 'admins') {
        return { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) };
      }
      return { select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) };
    });

    renderAdmin();

    expect(await screen.findByText(/Acesso Restrito/i)).toBeInTheDocument();
  });

  describe('Exclusão de Anexos (LGPD — Issue #17)', () => {
    const setupMocks = ({ attachments, removeResult, deleteResult }) => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: ADMIN_USER } } });

      supabase.from.mockImplementation((table) => {
        if (table === 'admins') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: () => Promise.resolve({ data: { user_id: ADMIN_USER.id }, error: null }) }),
            }),
          };
        }
        if (table === 'projects') {
          return { select: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) };
        }
        if (table === 'client_requests') {
          return { select: () => ({ order: () => Promise.resolve({ data: [MOCK_REQUEST], error: null }) }) };
        }
        if (table === 'client_attachments') {
          return {
            select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: attachments, error: null }) }) }),
            delete: () => ({ eq: () => Promise.resolve(deleteResult ?? { error: null }) }),
          };
        }
        // client_messages e demais tabelas: vazio por padrão
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }) };
      });

      supabase.storage.from.mockImplementation(() => ({
        createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'https://fake.url' }, error: null })),
        remove: vi.fn(() => Promise.resolve(removeResult ?? { error: null })),
      }));
    };

    const openClientsTabAndSelectRequest = async () => {
      const clientsTabBtn = await screen.findByRole('button', { name: /Demandas de Clientes/i });
      fireEvent.click(clientsTabBtn);
      const reqDate = await screen.findByText(/01\/01\/2026/i);
      fireEvent.click(reqDate.closest('.client-req-card'));
    };

    it('exibe o botão Excluir para anexos de clientes', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'client-user-123456/req-1/briefing.pdf' };
      setupMocks({ attachments: [att] });

      renderAdmin();
      await openClientsTabAndSelectRequest();

      expect(await screen.findByRole('button', { name: /Excluir briefing\.pdf/i })).toBeInTheDocument();
    });

    it('exclui o anexo com sucesso: remove do storage, da tabela e da lista', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'client-user-123456/req-1/briefing.pdf' };
      setupMocks({ attachments: [att] });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderAdmin();
      await openClientsTabAndSelectRequest();

      const deleteBtn = await screen.findByRole('button', { name: /Excluir briefing\.pdf/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.queryByText(/briefing\.pdf/i)).not.toBeInTheDocument();
      });
      expect(await screen.findByText(/Anexo excluído com sucesso/i)).toBeInTheDocument();
      expect(supabase.storage.from).toHaveBeenCalledWith('client-assets');

      window.confirm.mockRestore();
    });

    it('não exclui nada quando o admin cancela a confirmação', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'client-user-123456/req-1/briefing.pdf' };
      setupMocks({ attachments: [att] });
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderAdmin();
      await openClientsTabAndSelectRequest();

      const deleteBtn = await screen.findByRole('button', { name: /Excluir briefing\.pdf/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => expect(window.confirm).toHaveBeenCalled());
      expect(screen.getByText(/briefing\.pdf/i)).toBeInTheDocument();
      expect(screen.queryByText(/Anexo excluído com sucesso/i)).not.toBeInTheDocument();

      window.confirm.mockRestore();
    });

    it('mantém o anexo e exibe erro quando a exclusão do storage falha', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'client-user-123456/req-1/briefing.pdf' };
      setupMocks({ attachments: [att], removeResult: { error: { message: 'falha' } } });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderAdmin();
      await openClientsTabAndSelectRequest();

      const deleteBtn = await screen.findByRole('button', { name: /Excluir briefing\.pdf/i });
      fireEvent.click(deleteBtn);

      expect(await screen.findByText(/Erro ao excluir o arquivo do armazenamento/i)).toBeInTheDocument();
      expect(screen.getByText(/briefing\.pdf/i)).toBeInTheDocument();

      window.confirm.mockRestore();
    });
  });
});
