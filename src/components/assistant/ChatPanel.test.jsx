import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatPanel } from './ChatPanel';
import { ASSISTANT_CONTACT_CHANNELS } from '../../lib/assistantFaq';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

describe('ChatPanel (Issue #35 & regressão CONTACT_KEYWORDS)', () => {
  let fetchSpy;

  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('responde o starter de stack via FAQ sem chamar fetch', async () => {
    render(<ChatPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Qual stack ele usa?' }));

    await waitFor(() => {
      expect(screen.getByText(/React, Vite/i)).toBeInTheDocument();
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('abre automaticamente o formulário ContactCapture quando a última pergunta do usuário contém palavra-chave de contato', async () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText('Escreva sua pergunta...');
    fireEvent.change(input, { target: { value: 'Quero pedir um orçamento para meu site' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Deixa seu nome e e-mail que o Yure te responde direto/i)).toBeInTheDocument();
    });
    expect(screen.getByText(new RegExp(ASSISTANT_CONTACT_CHANNELS.email, 'i'))).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();

    // Fechar o formulário deve mantê-lo fechado ao enviar outra pergunta sem keyword de contato
    fireEvent.click(screen.getByRole('button', { name: 'Agora não' }));
    expect(screen.queryByText(/Deixa seu nome e e-mail que o Yure te responde direto/i)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Qual stack ele usa?' } });
    fireEvent.submit(input.closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/React, Vite/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/Deixa seu nome e e-mail que o Yure te responde direto/i)).not.toBeInTheDocument();
  });
});
