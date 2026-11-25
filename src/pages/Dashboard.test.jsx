import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';

const mockRange = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: (...args) => mockRange(...args),
          })),
        })),
      })),
    })),
  },
}));

vi.mock('../components/RecentRepos', () => ({
  RecentRepos: () => <div data-testid="recent-repos" />,
}));

describe('Dashboard (Issue #28 — sem flash de mock + fallback seguro)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exibe estado de carregamento sem renderizar projetos mockados antes da resposta do Supabase', async () => {
    mockRange.mockResolvedValueOnce({
      data: [
        {
          id: 'real-1',
          title: 'Projeto Real Supabase',
          description: 'Descrição real',
          tags: ['React'],
        },
      ],
      error: null,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    // No primeiro frame síncrono, não deve aparecer projeto mockado
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Carregando projetos/i)).toBeInTheDocument();

    expect(await screen.findByText('Projeto Real Supabase')).toBeInTheDocument();
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
  });

  it('faz fallback explícito para MOCK_PROJECTS quando o Supabase retorna erro', async () => {
    mockRange.mockResolvedValueOnce({
      data: null,
      error: { message: 'Falha de rede' },
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Portfólio Dinâmico & Inteligente/i)).toBeInTheDocument();
    });
  });
});
