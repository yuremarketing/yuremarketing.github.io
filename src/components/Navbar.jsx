import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const location = useLocation();

  return (
    <header className="navbar-header">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-badge">YM</span>
          <span className="logo-text">yuremarketing</span>
        </Link>

        <nav className="navbar-nav" aria-label="Principal">
          <Link
            to="/"
            aria-current={location.pathname === '/' ? 'page' : undefined}
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Projetos
          </Link>
          <Link
            to="/about"
            aria-current={location.pathname === '/about' ? 'page' : undefined}
            className={`nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          >
            Sobre Mim
          </Link>
          <Link
            to="/portal"
            aria-current={location.pathname === '/portal' ? 'page' : undefined}
            className={`nav-link ${location.pathname === '/portal' ? 'active' : ''}`}
          >
            Área do Cliente
          </Link>
          <ThemeToggle />
        </nav>
      </div>

      <style>{`
        .navbar-header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: var(--card-bg);
          backdrop-filter: var(--backdrop-blur);
          -webkit-backdrop-filter: var(--backdrop-blur);
          border-bottom: 1px solid var(--card-border);
          padding: 0.8rem 0;
        }

        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 700;
          font-size: 1.1rem;
        }

        .logo-badge {
          background: var(--accent-color);
          color: #ffffff;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-family: var(--font-mono);
          font-size: 0.9rem;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: 1.2rem;
          flex-wrap: wrap;
        }

        .nav-link {
          font-weight: 500;
          font-size: 0.95rem;
          padding: 0.4rem 0.8rem;
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast), background-color var(--transition-fast), opacity var(--transition-fast);
          opacity: 0.8;
        }

        .nav-link:hover,
        .nav-link.active,
        .nav-link[aria-current="page"] {
          opacity: 1;
          color: var(--accent-color);
          background: rgba(0, 0, 0, 0.04);
        }

        .nav-link[aria-current="page"] {
          font-weight: 700;
        }

        [data-theme="dark"] .nav-link:hover,
        [data-theme="dark"] .nav-link.active,
        [data-theme="dark"] .nav-link[aria-current="page"] {
          background: rgba(255, 255, 255, 0.05);
        }
      `}</style>
    </header>
  );
}
