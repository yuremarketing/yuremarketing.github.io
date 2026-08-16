import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('Processando autenticação com LinkedIn...');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      setStatus(`Erro na autenticação: ${error}`);
      setLoading(false);
      return;
    }

    if (code) {
      setStatus('Código recebido do LinkedIn! Carregando dados do perfil...');
      
      // Simulando / ou processando dados do perfil obtidos pelo token OpenID
      // Na autenticação OpenID Connect do LinkedIn, o id_token decodificado ou userInfo traz o perfil.
      setTimeout(() => {
        const mockLinkedInProfile = {
          name: 'Yure Marketing',
          headline: 'Engenheiro de Software & Especialista em IA',
          picture: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
          summary: 'Profissional focado em automação de agentes de IA, arquiteturas escaláveis em nuvem e desenvolvimento frontend de alta performance.',
        };

        localStorage.setItem('linkedin_profile', JSON.stringify(mockLinkedInProfile));
        setStatus('Perfil do LinkedIn conectado com sucesso!');
        setLoading(false);

        setTimeout(() => {
          navigate('/about');
        }, 1200);
      }, 1000);
    } else {
      setStatus('Nenhum código de autorização encontrado.');
      setLoading(false);
    }
  }, [searchParams, navigate]);

  return (
    <main className="callback-page container animate-fade-in">
      <div className="glass-panel callback-card">
        {loading ? <div className="spinner">🔄</div> : null}
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
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  );
}
