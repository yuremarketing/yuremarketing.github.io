import React, { useState } from 'react';

export function ConsentGate({ onAccept }) {
  const [checked, setChecked] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  return (
    <div className="consent-gate">
      <p className="consent-lead">
        Antes de começar, preciso do seu consentimento pra conversar sobre o Yure e seus projetos.
      </p>
      <ul className="consent-list">
        <li>Posso perguntar seu nome e e-mail só se você quiser receber um retorno fora do chat.</li>
        <li>O conteúdo da conversa é processado por um provedor de IA externo pra gerar as respostas.</li>
        <li>Por padrão, a conversa não é salva — some ao recarregar a página.</li>
      </ul>

      <button type="button" className="consent-policy-toggle" onClick={() => setShowPolicy((v) => !v)}>
        {showPolicy ? 'Ocultar' : 'Ler'} o resumo da política de privacidade
      </button>

      {showPolicy && (
        <p className="consent-policy-text">
          Nome e e-mail são eliminados depois de viabilizar o contato; nenhum dado é usado para marketing sem
          consentimento separado. Dúvidas ou pedido de eliminação de dados: <strong>yure.mark@gmail.com</strong> ou
          WhatsApp <strong>+55&nbsp;61&nbsp;99408-5093</strong>.
        </p>
      )}

      <label className="consent-check">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>Li e concordo com a política de privacidade.</span>
      </label>

      <button type="button" className="btn btn-primary consent-start" disabled={!checked} onClick={onAccept}>
        Iniciar conversa
      </button>

      <style>{`
        .consent-gate {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          padding: 1rem;
          font-size: 0.9rem;
        }

        .consent-lead {
          margin: 0;
          line-height: 1.5;
        }

        .consent-list {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          font-size: 0.85rem;
          opacity: 0.85;
          line-height: 1.45;
        }

        .consent-list li {
          display: flex;
          gap: 0.5rem;
        }

        .consent-list li::before {
          content: '';
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--accent-color);
          margin-top: 0.55em;
          flex-shrink: 0;
        }

        .consent-policy-toggle {
          align-self: flex-start;
          font-size: 0.8rem;
          color: var(--accent-color);
          text-decoration: underline;
          padding: 0;
        }

        .consent-policy-text {
          margin: 0;
          padding: 0.7rem 0.8rem;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.04);
          border: 1px solid var(--card-border);
          font-size: 0.8rem;
          line-height: 1.55;
          opacity: 0.9;
        }

        [data-theme='dark'] .consent-policy-text {
          background: rgba(255, 255, 255, 0.05);
        }

        .consent-check {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          font-size: 0.85rem;
          line-height: 1.4;
        }

        .consent-check input {
          width: 17px;
          height: 17px;
          margin-top: 0.1em;
          accent-color: var(--accent-color);
          flex-shrink: 0;
        }

        .consent-start {
          width: 100%;
          padding: 0.65rem 1rem;
        }

        .consent-start:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
