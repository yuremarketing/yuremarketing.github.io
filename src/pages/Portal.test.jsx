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
});
