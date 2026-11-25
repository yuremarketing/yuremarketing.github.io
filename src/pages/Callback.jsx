import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const EXCHANGE_URL = `${SUPABASE_URL}/functions/v1/linkedin-oauth-exchange`;

export function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processando autenticação com LinkedIn...');
  const [loading, setLoading] = useState(true);
  // O `code` do LinkedIn é de uso único: em React.StrictMode (dev) o efeito
  // roda duas vezes, e a 2ª chamada gastaria o code à toa e falharia
  // (achado do Tech Lead, Turno 29).
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const error = searchParams.get('error');

    // Lê e remove na hora: o state só pode ser conferido uma vez, nunca fica
    // disponível pra reuso (proteção real contra CSRF/replay).
    const expectedState = sessionStorage.getItem('linkedin_oauth_state');
    sessionStorage.removeItem('linkedin_oauth_state');

    if (error) {
      setStatus(`Erro na autenticação: ${error}`);
      setLoading(false);
      return;
    }

    if (!code) {
      setStatus('Nenhum código de autorização encontrado.');
      setLoading(false);
      return;
    }

    if (!expectedState || returnedState !== expectedState) {
      setStatus('Sessão de login inválida ou expirada. Tenta conectar de novo.');
      setLoading(false);
      return;
    }

    setStatus('Código recebido do LinkedIn! Carregando dados do perfil...');

    const redirectUri = window.location.origin + '/callback';

    fetch(EXCHANGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ code, redirect_uri: redirectUri }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('exchange-failed');
        return response.json();
      })
      .then((profile) => {
        localStorage.setItem('linkedin_profile', JSON.stringify(profile));
        setStatus('Perfil do LinkedIn conectado com sucesso!');
        setLoading(false);
        setTimeout(() => navigate('/about'), 1200);
      })
      .catch(() => {
        setStatus('Não foi possível concluir o login com o LinkedIn. Tenta de novo em um instante.');
        setLoading(false);
      });
  }, [searchParams, navigate]);

  return (
    <main id="main-content" tabIndex={-1} className="callback-page container animate-fade-in">
      <div className="glass-panel callback-card">
        {loading ? <div className="spinner" aria-hidden="true">🔄</div> : null}
        <h2>{status}</h2>
      </div>

      <style>{`
        .callback-page {
          padding-top: 5rem;
          display: flex;
          justify-content: center;
        }

        .callback-card {
          padding: 3rem;
          text-align: center;
          max-width: 500px;
        }

        .spinner {
          font-size: 2rem;
          margin-bottom: 1rem;

          @media (prefers-reduced-motion: no-preference) {
            animation: spin 1s linear infinite;
          }
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
