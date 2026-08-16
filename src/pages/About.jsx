import React, { useEffect, useState } from 'react';

export function About() {
  const linkedinClientId = import.meta.env.VITE_LINKEDIN_CLIENT_ID || '774nfobuuhqwwj';
  const redirectUri = window.location.origin + '/callback';
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem('linkedin_profile');
    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Erro ao ler perfil do LinkedIn', e);
      }
    }
  }, []);

  const handleLinkedInLogin = () => {
    const scope = 'openid profile email';
    const state = Math.random().toString(36).substring(7);
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${linkedinClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
  };

  const handleDisconnect = () => {
    localStorage.removeItem('linkedin_profile');
    setProfile(null);
  };

  return (
    <main className="about-page container animate-fade-in">
      <section className="glass-panel about-card">
        {profile ? (
          <div className="profile-container">
            <div className="profile-header">
              <img src={profile.picture} alt={profile.name} className="profile-avatar" />
              <div>
                <h1 className="profile-name">{profile.name}</h1>
                <p className="profile-headline">{profile.headline}</p>
                <span className="badge-connected">✓ LinkedIn Conectado</span>
              </div>
            </div>

            <div className="profile-body">
              <h2>Resumo Profissional</h2>
              <p className="profile-summary">{profile.summary}</p>
            </div>

            <button onClick={handleDisconnect} className="btn-disconnect">
              Desconectar LinkedIn
            </button>
          </div>
        ) : (
          <div className="default-about">
            <h1 className="about-title">Sobre Mim</h1>
            <p className="about-bio">
              Olá! Sou o criador por trás do portfólio <strong>yuremarketing</strong>. Desenvolvo aplicações web modernas,
              arquiteturas escaláveis e soluções avançadas baseadas em Inteligência Artificial.
            </p>

            <div className="linkedin-box">
              <h2>Integração com LinkedIn</h2>
              <p>
                Conecte sua conta do LinkedIn para sincronizar automaticamente seu perfil profissional via OpenID Connect.
              </p>

              <button onClick={handleLinkedInLogin} className="btn-linkedin">
                <span>in</span> Conectar com LinkedIn
              </button>
            </div>
          </div>
        )}
      </section>

      <style>{`
        .about-page {
          padding-top: 3rem;
          padding-bottom: 4rem;
          max-width: 800px;
        }

        .about-card {
          padding: 2.5rem;
        }

        .about-title {
          font-size: 2.2rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }

        .about-bio {
          font-size: 1.1rem;
          line-height: 1.6;
          opacity: 0.9;
          margin-bottom: 2rem;
        }

        .profile-header {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--card-border);
        }

        .profile-avatar {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid var(--accent-color);
        }

        .profile-name {
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 0.2rem;
        }

        .profile-headline {
          font-size: 1rem;
          opacity: 0.85;
          margin-bottom: 0.5rem;
        }

        .badge-connected {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #10b981;
          background: rgba(16, 185, 129, 0.15);
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .profile-body h2 {
          font-size: 1.3rem;
          margin-bottom: 0.8rem;
        }

        .profile-summary {
          font-size: 1.05rem;
          line-height: 1.6;
          opacity: 0.9;
          margin-bottom: 2rem;
        }

        .btn-disconnect {
          background: transparent;
          border: 1px solid var(--card-border);
          color: var(--text-color);
          padding: 0.5rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity var(--transition-fast);
        }

        .btn-disconnect:hover {
          opacity: 1;
          border-color: #ef4444;
          color: #ef4444;
        }

        .linkedin-box {
          border-top: 1px solid var(--card-border);
          padding-top: 1.8rem;
        }

        .linkedin-box h2 {
          font-size: 1.3rem;
          margin-bottom: 0.5rem;
        }

        .linkedin-box p {
          font-size: 0.95rem;
          opacity: 0.8;
          margin-bottom: 1.2rem;
        }

        .btn-linkedin {
          background: #0a66c2;
          color: #ffffff;
          font-weight: 600;
          padding: 0.7rem 1.4rem;
          border-radius: var(--radius-sm);
          display: inline-flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.95rem;
          transition: background var(--transition-fast);
        }

        .btn-linkedin:hover {
          background: #004182;
        }

        .btn-linkedin span {
          font-family: var(--font-sans);
          font-weight: 800;
          background: #ffffff;
          color: #0a66c2;
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-size: 0.8rem;
        }
      `}</style>
    </main>
  );
}
