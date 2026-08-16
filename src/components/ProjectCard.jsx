import React from 'react';

export function ProjectCard({ project }) {
  const { title, description, url, github_url, tags = [], image_url } = project;

  return (
    <article className="glass-panel project-card">
      {image_url && (
        <div className="card-image-wrapper">
          <img src={image_url} alt={title} className="card-image" loading="lazy" />
        </div>
      )}

      <div className="card-content">
        <h3 className="card-title">{title}</h3>
        <p className="card-description">{description}</p>

        {tags.length > 0 && (
          <div className="card-tags">
            {tags.map((tag, idx) => (
              <span key={idx} className="tag-pill">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="card-actions">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              Ver Projeto ↗
            </a>
          )}
          {github_url && (
            <a href={github_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              GitHub
            </a>
          )}
        </div>
      </div>

      <style>{`
        .project-card {
          display: flex;
          flex-direction: column;
          overflow: hidden;
          height: 100%;
        }

        .card-image-wrapper {
          width: 100%;
          height: 180px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.05);
        }

        .card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--transition-smooth);
        }

        .project-card:hover .card-image {
          transform: scale(1.05);
        }

        .card-content {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }

        .card-title {
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .card-description {
          font-size: 0.95rem;
          opacity: 0.85;
          line-height: 1.5;
          margin-bottom: 1.2rem;
          flex-grow: 1;
        }

        .card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 1.2rem;
        }

        .tag-pill {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          padding: 0.2rem 0.6rem;
          border-radius: 20px;
          background: rgba(0, 0, 0, 0.06);
          border: 1px solid var(--card-border);
        }

        [data-theme="dark"] .tag-pill {
          background: rgba(255, 255, 255, 0.08);
        }

        .card-actions {
          display: flex;
          gap: 0.8rem;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.88rem;
          font-weight: 600;
          transition: all var(--transition-fast);
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .btn-primary {
          background: var(--accent-color);
          color: #ffffff;
        }

        .btn-primary:hover {
          filter: brightness(1.15);
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid var(--card-border);
          color: var(--text-color);
        }

        .btn-secondary:hover {
          border-color: var(--accent-color);
          color: var(--accent-color);
        }
      `}</style>
    </article>
  );
}
