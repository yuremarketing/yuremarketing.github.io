import React from 'react';

export function AssistantLauncher({ open, onClick }) {
  return (
    <button
      type="button"
      className="assistant-launcher"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={open ? 'Fechar assistente' : 'Abrir assistente'}
    >
      {open ? (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.4 8.4 0 0 1-1.2 4.4L21 20l-4.3-1.2a8.5 8.5 0 1 1 4.3-7.3Z" />
        </svg>
      )}

      <style>{`
        .assistant-launcher {
          position: fixed;
          right: clamp(16px, 4vw, 28px);
          bottom: clamp(16px, 4vw, 28px);
          z-index: 60;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--accent-color);
          color: #ffffff;
          display: grid;
          place-items: center;
          box-shadow: var(--shadow-lg);
          transition: transform var(--transition-fast);
        }

        .assistant-launcher:hover {
          transform: translateY(-2px) scale(1.03);
        }

        @media (prefers-reduced-motion: reduce) {
          .assistant-launcher:hover {
            transform: none;
          }
        }
      `}</style>
    </button>
  );
}
