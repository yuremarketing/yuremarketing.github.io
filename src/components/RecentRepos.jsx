import React, { useEffect, useState } from 'react';

const GITHUB_USER = 'yuremarketing';
const CACHE_KEY = 'recent-repos-cache-v1';
const CACHE_TTL_MS = 15 * 60 * 1000;
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const DISPLAY_NAME_OVERRIDES = {
  'We-re_going_to_blowup_everything': 'Protótipo de Jogo — Godot Engine',
};

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, cachedAt } = JSON.parse(raw);
    if (Date.now() - cachedAt > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, cachedAt: Date.now() }));
  } catch {
    // sessionStorage indisponível (modo privado, cota excedida etc.) — segue sem cache
  }
}

export function filterRecentRepos(repos) {
  const cutoff = Date.now() - SIX_MONTHS_MS;
  return repos
    .filter((repo) => !repo.fork && repo.language && new Date(repo.pushed_at).getTime() >= cutoff)
    .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
}

export function RecentRepos() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = readCache();
      if (cached) {
        setRepos(cached);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `https://api.github.com/users/${GITHUB_USER}/repos?sort=pushed&per_page=100`
        );
        if (!res.ok) throw new Error(`GitHub API respondeu ${res.status}`);
        const data = await res.json();
        const filtered = filterRecentRepos(data);
        if (!cancelled) {
          setRepos(filtered);
          writeCache(filtered);
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (failed || (!loading && repos.length === 0)) {
    return null;
  }

  return (
    <section className="recent-repos-section">
      <div className="section-header">
        <h2 className="fn-header">02. repos_recentes()</h2>
        <span className="projects-count">últimos 6 meses</span>
      </div>

      {loading ? (
        <div className="loading-container">Carregando repositórios...</div>
      ) : (
        <div className="repos-grid">
          {repos.map((repo) => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="repo-card"
            >
              <div className="repo-card-header">
                <h3>{DISPLAY_NAME_OVERRIDES[repo.name] || repo.name}</h3>
                {repo.stargazers_count > 0 && (
                  <span className="repo-stars">★ {repo.stargazers_count}</span>
                )}
              </div>
              <p className="repo-description">{repo.description || 'Sem descrição.'}</p>
              <div className="repo-footer">
                <span className="repo-language">{repo.language}</span>
                <span className="repo-updated">
                  Atualizado em {new Date(repo.pushed_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      <style>{recentReposStyles}</style>
    </section>
  );
}

const recentReposStyles = `
  .recent-repos-section {
    margin-top: 4rem;
  }

  .repos-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.5rem;
  }

  .repo-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1.5rem;
    color: var(--text-color);
    text-decoration: none;
    transition: transform var(--transition-fast);
  }

  /* Painel HUD: o chanfro de canto fica num pseudo-elemento decorativo atrás do
     conteúdo, nunca no <a> em si — clip-path direto no <a> cortaria o outline de
     :focus-visible (WCAG 2.4.7) e o glow de hover abaixo (achado do Tech Lead,
     Turno 38). */
  .repo-card::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-md);
    backdrop-filter: var(--backdrop-blur);
    box-shadow: var(--shadow-sm);
    clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
    transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
  }

  .repo-card:hover::before {
    border-color: var(--accent-color);
    box-shadow: var(--shadow-lg);
  }

  @supports (color: color-mix(in srgb, red, blue)) {
    .repo-card:hover::before {
      box-shadow: var(--shadow-lg), 0 0 28px -6px color-mix(in srgb, var(--accent-color) 45%, transparent);
    }
  }

  .repo-card:hover {
    @media (prefers-reduced-motion: no-preference) {
      transform: translateY(-4px);
    }
  }

  .repo-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .repo-card-header h3 {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    word-break: break-word;
  }

  .repo-stars {
    font-family: var(--font-mono);
    font-size: 0.85rem;
    opacity: 0.8;
    white-space: nowrap;
  }

  .repo-description {
    font-size: 0.9rem;
    opacity: 0.85;
    line-height: 1.5;
    margin: 0;
    flex-grow: 1;
  }

  .repo-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    opacity: 0.7;
    gap: 0.5rem;
  }

  .repo-language {
    font-weight: 600;
    color: var(--accent-color);
  }
`;
