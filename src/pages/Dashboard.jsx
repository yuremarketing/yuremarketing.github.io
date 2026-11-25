import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ProjectCard } from '../components/ProjectCard';
import { RecentRepos } from '../components/RecentRepos';
import { Link } from 'react-router-dom';

const PAGE_SIZE = 6;

const MOCK_PROJECTS = [
  {
    id: '1',
    title: 'Portfólio Dinâmico & Inteligente',
    description: 'Portfólio de alta performance construído com Vite, React, Supabase e LinkedIn OpenID Connect via Docker.',
    url: 'https://yuremarketing.github.io',
    github_url: 'https://github.com/yuremarketing/yuremarketing.github.io',
    tags: ['React', 'Vite', 'Supabase', 'Docker', 'CSS Pure'],
    image_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: '2',
    title: 'AI Engineering & Agent Automation',
    description: 'Sistema de orquestração de agentes autônomos para automação de fluxos de desenvolvimento e infraestrutura.',
    url: 'https://github.com/yuremarketing',
    github_url: 'https://github.com/yuremarketing',
    tags: ['AI Engineering', 'Python', 'LLM', 'Docker'],
    image_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  }
];

export function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialError, setInitialError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);

  const sentinelRef = useRef(null);
  const pageRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(false);

  const fetchInitialProjects = useCallback(async () => {
    setLoading(true);
    setInitialError(null);
    setLoadMoreError(null);

    let supabaseClient = null;
    try {
      const mod = await import('../lib/supabase');
      supabaseClient = mod?.supabase ?? null;
    } catch (err) {
      console.error('[Dashboard] Erro ao inicializar cliente Supabase:', err);
      setProjects([]);
      setInitialError('Não foi possível carregar os projetos agora.');
      setHasMore(false);
      hasMoreRef.current = false;
      setLoading(false);
      return;
    }

    if (!supabaseClient) {
      if (import.meta.env.DEV) {
        setProjects(MOCK_PROJECTS);
      } else {
        console.error('[Dashboard] Cliente Supabase não configurado em produção.');
        setProjects([]);
        setInitialError('Não foi possível carregar os projetos agora.');
      }
      setHasMore(false);
      hasMoreRef.current = false;
      setLoading(false);
      return;
    }

    try {
      const from = 0;
      const to = PAGE_SIZE - 1;

      const { data, error } = await supabaseClient
        .from('projects')
        .select('*')
        .eq('visible', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('[Dashboard] Erro ao carregar projetos:', error);
        setProjects([]);
        setInitialError('Não foi possível carregar os projetos agora.');
        setHasMore(false);
        hasMoreRef.current = false;
        return;
      }

      const list = Array.isArray(data) ? data : [];
      setProjects(list);
      const more = list.length === PAGE_SIZE;
      setHasMore(more);
      hasMoreRef.current = more;
      pageRef.current = 1;
    } catch (err) {
      console.error('[Dashboard] Erro ao carregar projetos:', err);
      setProjects([]);
      setInitialError('Não foi possível carregar os projetos agora.');
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMoreProjects = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);

    try {
      const { supabase } = await import('../lib/supabase');
      if (!supabase) return;

      const currentPage = pageRef.current;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('visible', true)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        setLoadMoreError('Não foi possível carregar mais projetos.');
        setHasMore(false);
        hasMoreRef.current = false;
      } else if (data) {
        if (data.length > 0) {
          setProjects((prev) => [...prev, ...data]);
        }
        const more = data.length === PAGE_SIZE;
        setHasMore(more);
        hasMoreRef.current = more;
        pageRef.current = currentPage + 1;
      }
    } catch (err) {
      setLoadMoreError('Erro de conexão ao carregar mais projetos.');
      setHasMore(false);
      hasMoreRef.current = false;
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialProjects();
  }, [fetchInitialProjects]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMoreRef.current && !loadingMoreRef.current) {
          fetchMoreProjects();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, fetchMoreProjects]);

  return (
    <main id="main-content" tabIndex={-1} className="dashboard-page container animate-fade-in">
      <section className="hero-section">
        <h1 className="hero-title">
          Construindo Soluções de <span className="highlight">Engenharia de IA</span> & Software
        </h1>
        <p className="hero-subtitle">
          Bem-vindo ao meu portfólio pessoal. Aqui você encontrará meus projetos principais,
          experimentos com Inteligência Artificial e história profissional.
        </p>

        <div className="hero-actions">
          <Link to="/about" className="btn btn-hero">
            Conhecer mais sobre mim →
          </Link>
        </div>
      </section>

      <section className="projects-section">
        <div className="section-header">
          <h2>Projetos em Destaque</h2>
          {!loading && !initialError && (
            <span className="projects-count">{projects.length} projetos</span>
          )}
        </div>

        {loading ? (
          <div className="loading-container">Carregando projetos...</div>
        ) : initialError ? (
          <div className="projects-feedback projects-error" role="alert">
            <p>{initialError}</p>
            <button type="button" onClick={fetchInitialProjects} className="btn-retry">
              Tentar novamente
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-feedback projects-empty" role="status">
            <p>Novos projetos em breve.</p>
          </div>
        ) : (
          <>
            <div className="projects-grid">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {hasMore && (
              <div ref={sentinelRef} className="scroll-sentinel">
                {loadingMore && <div className="loading-more">Carregando mais projetos...</div>}
              </div>
            )}

            {loadMoreError && (
              <div className="load-more-error">
                <span>{loadMoreError}</span>
                <button type="button" onClick={fetchMoreProjects} className="btn-retry">
                  Tentar novamente
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <RecentRepos />

      <style>{`
        .dashboard-page {
          padding-top: 3rem;
          padding-bottom: 4rem;
        }

        .hero-section {
          text-align: center;
          max-width: 800px;
          margin: 0 auto 4rem auto;
        }

        .hero-title {
          font-size: 2.8rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 1.2rem;
          letter-spacing: -0.02em;
        }

        .highlight {
          color: var(--accent-color);
        }

        .hero-subtitle {
          font-size: 1.15rem;
          opacity: 0.85;
          line-height: 1.6;
          margin-bottom: 2rem;
        }

        .btn-hero {
          background: var(--accent-color);
          color: #ffffff;
          padding: 0.8rem 1.8rem;
          font-size: 1rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          box-shadow: var(--shadow-sm);
          transition: transform var(--transition-fast), filter var(--transition-fast);
        }

        .btn-hero:hover {
          transform: translateY(-2px);
          filter: brightness(1.1);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 0.8rem;
        }

        .section-header h2 {
          font-size: 1.6rem;
          font-weight: 700;
        }

        .projects-count {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          opacity: 0.7;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1.8rem;
        }

        .loading-container {
          text-align: center;
          padding: 3rem;
          opacity: 0.7;
        }

        .projects-feedback {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          text-align: center;
          padding: 2.5rem 1.5rem;
          border: 1px dashed var(--card-border);
          border-radius: var(--radius-md, 12px);
          color: var(--text-color);
          opacity: 0.85;
        }

        .projects-feedback p {
          margin: 0;
          font-size: 0.95rem;
        }

        .scroll-sentinel {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .loading-more {
          font-family: var(--font-mono);
          font-size: 0.88rem;
          opacity: 0.7;
        }

        .load-more-error {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
          font-size: 0.88rem;
          color: var(--text-color);
          opacity: 0.85;
        }

        .btn-retry {
          background: transparent;
          border: 1px solid var(--accent-color);
          color: var(--accent-color);
          border-radius: var(--radius-sm);
          padding: 0.3rem 0.8rem;
          font-size: 0.82rem;
          cursor: pointer;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .btn-retry:hover {
          background: var(--accent-color);
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.1rem;
          }
        }
      `}</style>
    </main>
  );
}
