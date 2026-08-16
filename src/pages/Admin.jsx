import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for project insertion
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const handleAddProject = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setLoading(true);

    const tagArray = tags.split(',').map((t) => t.trim()).filter(Boolean);

    try {
      const { data, error } = await supabase.from('projects').insert([
        {
          title,
          description,
          url,
          github_url: githubUrl,
          tags: tagArray,
          image_url: imageUrl,
          visible: true,
        },
      ]);

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg('🎉 Projeto adicionado com SUCESSO no Supabase!');
        setTitle('');
        setDescription('');
        setUrl('');
        setGithubUrl('');
        setTags('');
        setImageUrl('');
      }
    } catch (err) {
      setErrorMsg('Erro ao salvar projeto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-page container animate-fade-in">
      {!user ? (
        <section className="glass-panel login-card">
          <h1>Painel Administrativo</h1>
          <p>Entre com seu e-mail e senha cadastrados no Supabase Auth.</p>

          {errorMsg && <div className="alert-box alert-error">{errorMsg}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yure.mark@gmail.com"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar no Painel'}
            </button>
          </form>
        </section>
      ) : (
        <section className="glass-panel admin-dashboard">
          <div className="admin-header">
            <div>
              <h1>Painel de Controle</h1>
              <p className="user-email">Logado como: <strong>{user.email}</strong></p>
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              Sair
            </button>
          </div>

          {successMsg && <div className="alert-box alert-success">{successMsg}</div>}
          {errorMsg && <div className="alert-box alert-error">{errorMsg}</div>}

          <h2 className="form-title">Adicionar Novo Projeto</h2>
          <form onSubmit={handleAddProject} className="project-form">
            <div className="form-group">
              <label>Título do Projeto *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Novo App de IA"
                required
              />
            </div>

            <div className="form-group">
              <label>Descrição *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva as principais funcionalidades..."
                rows="3"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>URL do Projeto (Link Direto)</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="form-group">
                <label>URL do Repositório (GitHub)</label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Tags (separadas por vírgula)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="React, Docker, Python"
                />
              </div>
              <div className="form-group">
                <label>URL da Imagem de Capa</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Cadastrar Projeto'}
            </button>
          </form>
        </section>
      )}

      <style>{`
        .admin-page {
          padding-top: 3rem;
          padding-bottom: 4rem;
          max-width: 750px;
        }

        .login-card, .admin-dashboard {
          padding: 2.5rem;
        }

        .admin-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 1.2rem;
          margin-bottom: 1.8rem;
        }

        .user-email {
          font-size: 0.9rem;
          opacity: 0.8;
        }

        .form-title {
          font-size: 1.3rem;
          margin-bottom: 1.2rem;
        }

        .login-card h1, .admin-dashboard h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .login-card p {
          opacity: 0.8;
          font-size: 0.95rem;
          margin-bottom: 1.8rem;
        }

        .login-form, .project-form {
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        label {
          font-size: 0.85rem;
          font-weight: 600;
        }

        input, textarea {
          padding: 0.7rem 0.9rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
          background: rgba(0, 0, 0, 0.03);
          color: var(--text-color);
          font-family: inherit;
          font-size: 0.95rem;
        }

        [data-theme="dark"] input,
        [data-theme="dark"] textarea {
          background: rgba(255, 255, 255, 0.05);
        }

        input:focus, textarea:focus {
          outline: none;
          border-color: var(--accent-color);
        }

        .btn-block {
          width: 100%;
        }

        .alert-box {
          padding: 0.8rem 1rem;
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          margin-bottom: 1.2rem;
        }

        .alert-error {
          background: rgba(220, 38, 38, 0.15);
          color: #ef4444;
          border: 1px solid rgba(220, 38, 38, 0.3);
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        @media (max-width: 600px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
