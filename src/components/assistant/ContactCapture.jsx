import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function ContactCapture({ lastQuestion, onDone }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || status === 'sending') return;

    if (!supabase) {
      setStatus('error');
      return;
    }

    setStatus('sending');
    const { error } = await supabase.from('contact_requests').insert({
      name: name.trim(),
      email: email.trim(),
      note: lastQuestion || null,
    });

    if (error) {
      setStatus('error');
      return;
    }
    setStatus('done');
  }

  if (status === 'done') {
    return (
      <p className="contact-done">
        Obrigado! O Yure vai te responder por e-mail em breve.
        <button type="button" className="contact-dismiss" onClick={onDone}>
          Fechar
        </button>
      </p>
    );
  }

  return (
    <form className="contact-capture" onSubmit={handleSubmit}>
      <p className="contact-lead">Deixa seu nome e e-mail que o Yure te responde direto.</p>
      <input
        type="text"
        placeholder="Seu nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {status === 'error' && <p className="contact-error">Não consegui enviar — tenta de novo?</p>}
      <div className="contact-actions">
        <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Enviando...' : 'Enviar'}
        </button>
        <button type="button" className="contact-dismiss" onClick={onDone}>
          Agora não
        </button>
      </div>

      <style>{`
        .contact-capture {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.8rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
          background: rgba(0, 0, 0, 0.03);
          font-size: 0.85rem;
        }

        [data-theme='dark'] .contact-capture {
          background: rgba(255, 255, 255, 0.04);
        }

        .contact-lead {
          margin: 0 0 0.2rem;
        }

        .contact-capture input {
          padding: 0.5rem 0.6rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
          background: var(--bg-color);
          color: var(--text-color);
          font-size: 0.85rem;
        }

        .contact-error {
          margin: 0;
          font-size: 0.78rem;
          color: #c0392b;
        }

        .contact-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin-top: 0.2rem;
        }

        .contact-actions .btn {
          padding: 0.45rem 0.9rem;
          font-size: 0.82rem;
        }

        .contact-dismiss {
          font-size: 0.78rem;
          opacity: 0.7;
          text-decoration: underline;
          padding: 0;
        }

        .contact-done {
          margin: 0;
          padding: 0.8rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
          font-size: 0.85rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
        }
      `}</style>
    </form>
  );
}
