import React from 'react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label="Alternar tema claro/escuro"
      title="Alternar tema"
    >
      <span className="toggle-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
      <style>{`
        .theme-toggle-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 0.8rem;
          border-radius: var(--radius-sm);
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          color: var(--text-color);
          font-weight: 500;
          transition: all var(--transition-fast);
        }
        .theme-toggle-btn:hover {
          border-color: var(--accent-color);
          transform: scale(1.05);
        }
        .toggle-icon {
          font-size: 1.1rem;
        }
      `}</style>
    </button>
  );
}
