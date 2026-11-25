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
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
      ) : (
        <img
          src="/images/assistant-avatar.jpg"
          alt=""
          className="assistant-launcher-avatar"
          width="56"
          height="56"
        />
      )}

      <style>{`
        .assistant-launcher {
          position: fixed;
          right: clamp(16px, 4vw, 28px);
          bottom: clamp(16px, 4vw, 28px);
          z-index: 60;
          width: 60px;
          height: 60px;
          padding: 0;
          border-radius: 50%;
          overflow: hidden;
          background: var(--accent-color);
          color: #ffffff;
          border: 2px solid rgba(56, 189, 248, 0.55);
          display: grid;
          place-items: center;
          box-shadow: 0 8px 24px rgba(0, 122, 204, 0.35), 0 0 0 0 rgba(56, 189, 248, 0.4);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast);
        }

        .assistant-launcher-avatar {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .assistant-launcher:hover {
          border-color: #38bdf8;
          box-shadow: 0 10px 28px rgba(0, 122, 204, 0.55), 0 0 18px rgba(56, 189, 248, 0.6);

          @media (prefers-reduced-motion: no-preference) {
            transform: translateY(-3px) scale(1.08);
          }
        }
      `}</style>
    </button>
  );
}
