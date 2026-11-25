import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from './Dashboard';

const mockRange = vi.fn();
let supabaseMode = 'ok';

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          range: (...args) => mockRange(...args),
        })),
      })),
    })),
  })),
};

vi.mock('../lib/supabase', () => ({
  get supabase() {
    if (supabaseMode === 'throw') {
      throw new Error('Falha ao importar cliente Supabase');
    }
    if (supabaseMode === 'null') {
      return null;
    }
    return mockSupabaseClient;
  },
}));

vi.mock('../components/RecentRepos', () => ({
  RecentRepos: () => <div data-testid="recent-repos" />,
}));

describe('Dashboard (Issue #37 — zero mocks em produção + estados explícitos)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMode = 'ok';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('exibe estado de carregamento sem flash de mocks e renderiza projetos reais no sucesso', async () => {
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

    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Carregando projetos/i)).toBeInTheDocument();
    expect(screen.queryByText(/0 projetos/i)).not.toBeInTheDocument();

    expect(await screen.findByText('Projeto Real Supabase')).toBeInTheDocument();
    expect(screen.getByText('1 projetos')).toBeInTheDocument();
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
  });

  it('exibe estado de erro discreto com retry (sem mocks) quando o Supabase retorna erro', async () => {
    mockRange
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'Falha de rede' },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 'real-retry',
            title: 'Projeto Recuperado',
            description: 'Carregado após retry',
            tags: ['Vite'],
          },
        ],
        error: null,
      });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Não foi possível carregar os projetos agora/i);
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 projetos/i)).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Tentar novamente/i }));
    expect(await screen.findByText('Projeto Recuperado')).toBeInTheDocument();
  });

  it('exibe estado vazio explícito (sem mocks) quando a tabela retorna lista vazia', async () => {
    mockRange.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(/Novos projetos em breve/i);
    expect(screen.getByText('0 projetos')).toBeInTheDocument();
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI Engineering & Agent Automation/i)).not.toBeInTheDocument();
  });

  it('exibe estado de erro (sem mocks) quando uma exceção é lançada na busca (catch de rede)', async () => {
    mockRange.mockRejectedValueOnce(new Error('Network down'));

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Não foi possível carregar os projetos agora/i);
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('exibe estado de erro (sem mocks) quando o import/inicialização do Supabase lança exceção', async () => {
    supabaseMode = 'throw';

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Não foi possível carregar os projetos agora/i);
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('em produção (DEV=false) com supabase nulo, exibe erro explícito e nunca renderiza mocks', async () => {
    vi.stubEnv('DEV', false);
    supabaseMode = 'null';

    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Não foi possível carregar os projetos agora/i);
    expect(screen.queryByText(/Portfólio Dinâmico & Inteligente/i)).not.toBeInTheDocument();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('em DEV com supabase nulo (sem .env local), mantém fallback de MOCK_PROJECTS', async () => {
    vi.stubEnv('DEV', true);
    supabaseMode = 'null';

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
