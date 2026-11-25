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
          transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes assistantNeonPulse {
          0%, 100% {
            border-color: rgba(56, 189, 248, 0.75);
            box-shadow:
              0 10px 26px rgba(0, 122, 204, 0.45),
              0 0 12px rgba(56, 189, 248, 0.55),
              0 0 24px rgba(0, 122, 204, 0.3);
          }
          50% {
            border-color: #7dd3fc;
            box-shadow:
              0 14px 36px rgba(0, 122, 204, 0.7),
              0 0 24px rgba(56, 189, 248, 0.95),
              0 0 46px rgba(56, 189, 248, 0.55);
          }
        }

        .assistant-launcher:hover {
          border-color: #7dd3fc;
          box-shadow: 0 12px 32px rgba(0, 122, 204, 0.6), 0 0 22px rgba(56, 189, 248, 0.85);

          @media (prefers-reduced-motion: no-preference) {
            transform: translateY(-4px) scale(1.28);
            animation: assistantNeonPulse 1.8s ease-in-out infinite;
          }
        }

        .assistant-launcher:hover .assistant-launcher-avatar {
          @media (prefers-reduced-motion: no-preference) {
            transform: scale(1.06);
          }
        }
      `}</style>
    </button>
  );
}
