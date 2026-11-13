import React, { useEffect, useRef, useState } from 'react';
import { useAssistantChat } from '../../hooks/useAssistantChat';
import { ContactCapture } from './ContactCapture';

const CONTACT_KEYWORDS = [
  'contratar',
  'contrata',
  'orçamento',
  'orcamento',
  'disponibilidade',
  'freelance',
  'reunião',
  'reuniao',
  'falar com ele',
  'deixar contato',
];

const STARTERS = ['Quais projetos ele já lançou?', 'Qual stack ele usa?', 'Como falo com ele diretamente?'];

export function ChatPanel() {
  const { messages, sendMessage, isStreaming, error } = useAssistantChat();
  const [input, setInput] = useState('');
  const [showContactForm, setShowContactForm] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (last?.role === 'user' && CONTACT_KEYWORDS.some((k) => last.content.toLowerCase().includes(k))) {
      setShowContactForm(true);
    }
  }, [messages]);

  function handleSend(text) {
    setInput('');
    sendMessage(text);
  }

  const lastUserQuestion = [...messages].reverse().find((m) => m.role === 'user')?.content;

  return (
    <div className="chat-panel">
      <div className="chat-messages" ref={listRef}>
        {messages.length === 0 && (
          <p className="chat-greeting">
            Oi! Pode perguntar sobre o Yure e os projetos dele — só não vou guardar essa conversa depois que você
            recarregar a página.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            {m.content || (isStreaming && i === messages.length - 1 ? '···' : '')}
          </div>
        ))}

        {error && <p className="chat-error">{error}</p>}

        {showContactForm && (
          <ContactCapture lastQuestion={lastUserQuestion} onDone={() => setShowContactForm(false)} />
        )}
      </div>

      {messages.length === 0 && (
        <div className="chat-quick-replies">
          {STARTERS.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => handleSend(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {messages.length > 0 && !showContactForm && (
        <div className="chat-quick-replies">
          <button type="button" className="chip" onClick={() => setShowContactForm(true)}>
            Deixar contato pro Yure
          </button>
        </div>
      )}

      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim()) handleSend(input);
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escreva sua pergunta..."
          disabled={isStreaming}
        />
        <button type="submit" disabled={isStreaming || !input.trim()} aria-label="Enviar">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11.5 20 4l-7.5 16-2.3-7.2L4 11.5Z" />
          </svg>
        </button>
      </form>
      <p className="chat-disclaimer">Recarregar a página limpa esta conversa — nada é salvo por padrão.</p>

      <style>{`
        .chat-panel {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-height: 0;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 0.9rem 1rem 0.3rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          min-height: 160px;
        }

        .chat-greeting {
          margin: 0;
          font-size: 0.85rem;
          opacity: 0.85;
          line-height: 1.5;
        }

        .chat-msg {
          max-width: 85%;
          padding: 0.55rem 0.75rem;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          line-height: 1.48;
          white-space: pre-wrap;
        }

        .chat-msg-user {
          align-self: flex-end;
          background: var(--accent-color);
          color: #ffffff;
          border-bottom-right-radius: 4px;
        }

        .chat-msg-assistant {
          align-self: flex-start;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-bottom-left-radius: 4px;
        }

        .chat-error {
          margin: 0;
          font-size: 0.8rem;
          color: #c0392b;
        }

        .chat-quick-replies {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          padding: 0.3rem 1rem 0.6rem;
        }

        .chip {
          border: 1px solid var(--card-border);
          background: transparent;
          color: var(--text-color);
          font-size: 0.78rem;
          padding: 0.4rem 0.7rem;
          border-radius: 999px;
        }

        .chip:hover {
          border-color: var(--accent-color);
          color: var(--accent-color);
        }

        .chat-composer {
          display: flex;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          border-top: 1px solid var(--card-border);
        }

        .chat-composer input {
          flex: 1;
          min-width: 0;
          border: 1px solid var(--card-border);
          background: var(--bg-color);
          color: var(--text-color);
          border-radius: var(--radius-sm);
          padding: 0.55rem 0.7rem;
          font-size: 0.85rem;
        }

        .chat-composer button {
          border: none;
          background: var(--accent-color);
          color: #ffffff;
          border-radius: var(--radius-sm);
          width: 38px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
        }

        .chat-composer button:disabled {
          opacity: 0.4;
        }

        .chat-disclaimer {
          margin: 0;
          padding: 0 1rem 0.7rem;
          font-size: 0.68rem;
          font-family: var(--font-mono);
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
}
