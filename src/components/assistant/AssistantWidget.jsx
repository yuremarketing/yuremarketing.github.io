import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AssistantLauncher } from './AssistantLauncher';
import { ConsentGate } from './ConsentGate';
import { ChatPanel } from './ChatPanel';

export function AssistantWidget() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(false);

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <div className="assistant-widget">
      {open && (
        <section className="assistant-panel glass-panel" role="dialog" aria-label="Assistente do Yure">
          <header className="assistant-panel-head">
            <div className="assistant-avatar">YM</div>
            <div className="assistant-meta">
              <p className="assistant-title">Assistente do Yure</p>
              <p className="assistant-status">
                <span className="status-dot" />
                Online
              </p>
            </div>
            <button type="button" className="assistant-close" onClick={() => setOpen(false)} aria-label="Fechar assistente">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </header>

          <div className="assistant-body">
            {consented ? <ChatPanel /> : <ConsentGate onAccept={() => setConsented(true)} />}
          </div>
        </section>
      )}

      <AssistantLauncher open={open} onClick={() => setOpen((v) => !v)} />

      <style>{`
        .assistant-panel {
          position: fixed;
          right: clamp(12px, 3vw, 24px);
          bottom: clamp(82px, 13vw, 96px);
          z-index: 59;
          width: min(360px, calc(100vw - 32px));
          max-height: min(76vh, 560px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: none;
        }

        .assistant-panel:hover {
          transform: none;
          box-shadow: var(--shadow-lg);
        }

        .assistant-panel-head {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.8rem 0.8rem 0.75rem;
          border-bottom: 1px solid var(--card-border);
          flex-shrink: 0;
        }

        .assistant-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.06);
          color: var(--accent-color);
          display: grid;
          place-items: center;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 600;
          flex-shrink: 0;
        }

        [data-theme='dark'] .assistant-avatar {
          background: rgba(255, 255, 255, 0.08);
        }

        .assistant-meta {
          flex: 1;
          min-width: 0;
        }

        .assistant-title {
          margin: 0;
          font-size: 0.88rem;
          font-weight: 600;
        }

        .assistant-status {
          margin: 0.1rem 0 0;
          font-size: 0.72rem;
          opacity: 0.75;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2f8f5b;
          flex-shrink: 0;
        }

        .assistant-close {
          width: 26px;
          height: 26px;
          border-radius: var(--radius-sm);
          display: grid;
          place-items: center;
          opacity: 0.7;
          flex-shrink: 0;
        }

        .assistant-close:hover {
          opacity: 1;
          color: var(--accent-color);
        }

        .assistant-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
