import React, { useEffect, useState } from 'react';
import { ProjectCard } from '../components/ProjectCard';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

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
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchProjects() {
      if (!supabase) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('visible', true)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          setProjects(data);
        }
      } catch (e) {
        console.warn('Usando projetos mockados como fallback', e);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  return (
    <main className="dashboard-page container animate-fade-in">
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
          <span className="projects-count">{projects.length} projetos</span>
        </div>

        {loading ? (
          <div className="loading-container">Carregando projetos...</div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

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

        @media (max-width: 768px) {
          .hero-title {
            font-size: 2.1rem;
          }
        }
      `}</style>
    </main>
  );
}
