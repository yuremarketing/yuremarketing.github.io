import React from 'react';

const LINKEDIN_URL = 'https://www.linkedin.com/company/yure-marketing';

export function About() {
  return (
    <main id="main-content" tabIndex={-1} className="about-page container animate-fade-in">
      <section className="glass-panel about-card">
        <div className="default-about">
          <h1 className="about-title fn-header">01. sobre_mim()</h1>
          <p className="about-bio">
            Olá! Sou o criador por trás do portfólio <strong>yuremarketing</strong>. Desenvolvo aplicações web modernas,
            arquiteturas escaláveis e soluções avançadas baseadas em Inteligência Artificial.
          </p>

          <div className="linkedin-box">
            <h2>LinkedIn</h2>
            <p>
              Acompanhe minha trajetória profissional, projetos e publicações diretamente na minha página do LinkedIn.
            </p>

            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-linkedin"
            >
              <span aria-hidden="true">in</span> Visitar LinkedIn →
            </a>
          </div>
        </div>
      </section>

      <style>{`
        .about-page {
          padding-top: 3rem;
          padding-bottom: 4rem;
          max-width: 800px;
        }

        .about-card {
          padding: 2.5rem;
        }

        .about-title {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .about-bio {
          font-size: 1.1rem;
          line-height: 1.6;
          opacity: 0.9;
          margin-bottom: 2rem;
        }

        .linkedin-box {
          padding: 1.8rem;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid var(--card-border);
        }

        [data-theme="dark"] .linkedin-box {
          background: rgba(255, 255, 255, 0.03);
        }

        .linkedin-box h2 {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }

        .linkedin-box p {
          font-size: 0.95rem;
          opacity: 0.85;
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .btn-linkedin {
          display: inline-flex;
          align-items: center;
          gap: 0.7rem;
          background: #0A66C2;
          color: #ffffff;
          padding: 0.8rem 1.5rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 0.95rem;
          transition: background var(--transition-fast), transform var(--transition-fast);
        }

        .btn-linkedin:hover {
          background: #004182;

          @media (prefers-reduced-motion: no-preference) {
            transform: translateY(-2px);
          }
        }

        .btn-linkedin span {
          font-family: var(--font-sans);
          font-weight: 800;
          font-size: 1.1rem;
          background: #ffffff;
          color: #0A66C2;
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }
      `}</style>
    </main>
  );
}
