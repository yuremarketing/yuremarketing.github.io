import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <div className="footer-logo-row">
            <span className="footer-badge">YM</span>
            <span className="footer-name">yuremarketing</span>
          </div>
          <p className="footer-tagline">
            Engenharia de software, agentes de IA e automação sob medida para negócios.
          </p>
        </div>

        <nav className="footer-links" aria-label="Contato e redes">
          <a
            href="https://wa.me/5561994085093"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link footer-cta"
          >
            WhatsApp
          </a>
          <a href="mailto:yure.mark@gmail.com" className="footer-link">
            yure.mark@gmail.com
          </a>
          <a
            href="https://www.linkedin.com/company/yure-marketing"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/yuremarketing"
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            GitHub
          </a>
        </nav>
      </div>

      <div className="container footer-bottom">
        <span>© {currentYear} Yure Mark. Todos os direitos reservados.</span>
      </div>

      <style>{`
        .site-footer {
          margin-top: auto;
          background: var(--card-bg);
          backdrop-filter: var(--backdrop-blur);
          -webkit-backdrop-filter: var(--backdrop-blur);
          border-top: 1px solid var(--card-border);
          padding: 2.2rem 0 1.4rem;
        }

        .footer-container {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1.5rem;
          flex-wrap: wrap;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 440px;
        }

        .footer-logo-row {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          font-weight: 700;
          font-size: 1rem;
        }

        .footer-badge {
          background: var(--accent-color);
          color: #ffffff;
          padding: 0.15rem 0.45rem;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
        }

        .footer-tagline {
          font-size: 0.9rem;
          opacity: 0.78;
          line-height: 1.5;
        }

        .footer-links {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .footer-link {
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
          font-size: 0.9rem;
          font-weight: 500;
          transition: color var(--transition-fast), border-color var(--transition-fast), background-color var(--transition-fast);
        }

        .footer-link:hover {
          color: var(--accent-color);
          border-color: var(--accent-color);
        }

        .footer-cta {
          background: var(--accent-color);
          color: #ffffff;
          border-color: var(--accent-color);
          font-weight: 600;
        }

        .footer-cta:hover {
          color: #ffffff;
          opacity: 0.92;
        }

        .footer-bottom {
          margin-top: 1.4rem;
          padding-top: 1rem;
          border-top: 1px solid var(--card-border);
          font-size: 0.82rem;
          opacity: 0.68;
        }
      `}</style>
    </footer>
  );
}
