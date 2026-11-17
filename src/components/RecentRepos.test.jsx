import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RecentRepos, filterRecentRepos } from './RecentRepos';

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function reposFixture() {
  return [
    {
      id: 1,
      name: 'repo-recente',
      fork: false,
      language: 'Python',
      description: 'Um projeto recente',
      pushed_at: daysAgo(10),
      stargazers_count: 3,
      html_url: 'https://github.com/yuremarketing/repo-recente',
    },
    {
      id: 2,
      name: 'repo-antigo',
      fork: false,
      language: 'JavaScript',
      description: 'Projeto de mais de 6 meses atrás',
      pushed_at: daysAgo(400),
      stargazers_count: 0,
      html_url: 'https://github.com/yuremarketing/repo-antigo',
    },
    {
      id: 3,
      name: 'repo-fork',
      fork: true,
      language: 'Go',
      description: 'Um fork',
      pushed_at: daysAgo(10),
      stargazers_count: 0,
      html_url: 'https://github.com/yuremarketing/repo-fork',
    },
    {
      id: 4,
      name: 'repo-vazio',
      fork: false,
      language: null,
      description: '',
      pushed_at: daysAgo(10),
      stargazers_count: 0,
      html_url: 'https://github.com/yuremarketing/repo-vazio',
    },
  ];
}

describe('filterRecentRepos', () => {
  it('mantém só repos não-fork, com linguagem, com push nos últimos 6 meses', () => {
    const result = filterRecentRepos(reposFixture());
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('repo-recente');
  });
});

describe('RecentRepos component', () => {
  beforeEach(() => {
    sessionStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderiza os cards dos repositórios filtrados após o fetch', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(reposFixture()),
    });

    render(<RecentRepos />);

    await waitFor(() => {
      expect(screen.getByText('repo-recente')).toBeInTheDocument();
    });

    expect(screen.queryByText('repo-antigo')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-fork')).not.toBeInTheDocument();
    expect(screen.queryByText('repo-vazio')).not.toBeInTheDocument();
  });

  it('não quebra a página e não renderiza nada se a API falhar', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 403 });

    const { container } = render(<RecentRepos />);

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
