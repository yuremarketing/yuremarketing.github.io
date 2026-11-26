import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Portal } from './Portal';
import { supabase } from '../lib/supabase';

// Mock do módulo supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'req-1' }, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        createSignedUrl: vi.fn(() => Promise.resolve({ data: { signedUrl: 'https://fake.url' }, error: null })),
      })),
    },
  },
}));

describe('Portal Component (Área Privada do Cliente)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
  });

  it('renderiza o formulário de login por Magic Link quando deslogado', async () => {
    render(<Portal />);

    expect(screen.getByText(/Acesso Seguro via Magic Link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Seu E-mail Corporativo ou Pessoal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Receber Magic Link por E-mail/i })).toBeInTheDocument();
  });

  it('chama signInWithOtp ao submeter o formulário de login', async () => {
    supabase.auth.signInWithOtp.mockResolvedValue({ error: null });

    render(<Portal />);

    const emailInput = screen.getByLabelText(/Seu E-mail Corporativo ou Pessoal/i);
    const submitBtn = screen.getByRole('button', { name: /Receber Magic Link por E-mail/i });

    fireEvent.change(emailInput, { target: { value: 'cliente@empresa.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'cliente@empresa.com',
        })
      );
    });

    expect(await screen.findByText(/Link de acesso seguro enviado!/i)).toBeInTheDocument();
  });

  it('exibe o dashboard do cliente quando autenticado', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123', email: 'cliente@empresa.com' },
        },
      },
    });

    render(<Portal />);

    expect(await screen.findByText(/Minhas Demandas & Orçamentos/i)).toBeInTheDocument();
    expect(screen.getByText(/cliente@empresa.com/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+ Nova Solicitação/i })).toBeInTheDocument();
  });

  it('exibe alerta inline acessível sem window.alert ao selecionar arquivo inválido ou acima de 15MB', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    supabase.auth.getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-123', email: 'cliente@empresa.com' },
        },
      },
    });

    render(<Portal />);

    const newReqBtn = await screen.findByRole('button', { name: /\+ Nova Solicitação/i });
    fireEvent.click(newReqBtn);

    const fileInput = screen.getByLabelText(/Anexar Briefing ou Imagem de Referência/i);

    const badExtFile = new File(['conteudo'], 'malware.exe', { type: 'application/octet-stream' });
    fireEvent.change(fileInput, { target: { files: [badExtFile] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/Extensão não permitida/i);
    expect(alertSpy).not.toHaveBeenCalled();

    const hugeFile = new File(['a'], 'grande.pdf', { type: 'application/pdf' });
    Object.defineProperty(hugeFile, 'size', { value: 16 * 1024 * 1024 });
    fireEvent.change(fileInput, { target: { files: [hugeFile] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(/ultrapassa o limite máximo de 15MB/i);
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  describe('Exclusão de Anexos (LGPD — Issue #17)', () => {
    const MOCK_USER = { id: 'user-123', email: 'cliente@empresa.com' };
    const MOCK_REQUEST = { id: 'req-1', status: 'pending', created_at: '2026-01-01T00:00:00Z', budget_estimate: null };

    const setupMocks = ({ attachments, removeResult, deleteResult }) => {
      supabase.auth.getSession.mockResolvedValue({ data: { session: { user: MOCK_USER } } });

      supabase.from.mockImplementation((table) => {
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

    it('exibe o botão Excluir só para anexos do próprio usuário', async () => {
      const ownAtt = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'user-123/req-1/briefing.pdf', uploaded_by: 'user-123' };
      const otherAtt = { id: 'att-2', file_name: 'outro.pdf', file_path: 'other/req-1/outro.pdf', uploaded_by: 'other-user' };
      setupMocks({ attachments: [ownAtt, otherAtt] });

      render(<Portal />);

      await screen.findByText(/briefing\.pdf/i);
      expect(screen.getByRole('button', { name: /Excluir briefing\.pdf/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Excluir outro\.pdf/i })).not.toBeInTheDocument();
    });

    it('exclui o anexo com sucesso: remove do storage, da tabela, da lista e mostra mensagem', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'user-123/req-1/briefing.pdf', uploaded_by: 'user-123' };
      setupMocks({ attachments: [att] });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<Portal />);

      const deleteBtn = await screen.findByRole('button', { name: /Excluir briefing\.pdf/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.queryByText(/briefing\.pdf/i)).not.toBeInTheDocument();
      });
      expect(await screen.findByText(/Anexo excluído com sucesso/i)).toBeInTheDocument();
      expect(supabase.storage.from).toHaveBeenCalledWith('client-assets');

      window.confirm.mockRestore();
    });

    it('não exclui nada quando o usuário cancela a confirmação', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'user-123/req-1/briefing.pdf', uploaded_by: 'user-123' };
      setupMocks({ attachments: [att] });
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<Portal />);

      const deleteBtn = await screen.findByRole('button', { name: /Excluir briefing\.pdf/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => expect(window.confirm).toHaveBeenCalled());
      expect(screen.getByText(/briefing\.pdf/i)).toBeInTheDocument();
      expect(screen.queryByText(/Anexo excluído com sucesso/i)).not.toBeInTheDocument();

      window.confirm.mockRestore();
    });

    it('mantém o anexo e exibe erro quando a exclusão do storage falha', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'user-123/req-1/briefing.pdf', uploaded_by: 'user-123' };
      setupMocks({ attachments: [att], removeResult: { error: { message: 'falha' } } });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<Portal />);

      const deleteBtn = await screen.findByRole('button', { name: /Excluir briefing\.pdf/i });
      fireEvent.click(deleteBtn);

      expect(await screen.findByText(/Erro ao excluir o arquivo do armazenamento/i)).toBeInTheDocument();
      expect(screen.getByText(/briefing\.pdf/i)).toBeInTheDocument();

      window.confirm.mockRestore();
    });

    it('mantém a mensagem de sucesso visível no DOM mesmo após excluir o último anexo', async () => {
      const att = { id: 'att-1', file_name: 'briefing.pdf', file_path: 'user-123/req-1/briefing.pdf', uploaded_by: 'user-123' };
      setupMocks({ attachments: [att] });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<Portal />);

      const deleteBtn = await screen.findByRole('button', { name: /Excluir briefing\.pdf/i });
      fireEvent.click(deleteBtn);

      expect(await screen.findByText(/Anexo excluído com sucesso/i)).toBeInTheDocument();
      expect(screen.queryByText(/briefing\.pdf/i)).not.toBeInTheDocument();

      window.confirm.mockRestore();
    });
  });
});
