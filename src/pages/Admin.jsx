import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Admin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form states for project insertion/edição
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [projects, setProjects] = useState([]);
  const [editingId, setEditingId] = useState(null);

  // Épico 3 - Demandas de Clientes & Orçamentos
  const [activeTab, setActiveTab] = useState('projects');
  const [clientRequests, setClientRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [reqMessages, setReqMessages] = useState([]);
  const [reqAttachments, setReqAttachments] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [newBudget, setNewBudget] = useState('');

  const checkAdmin = async (userId) => {
    if (!supabase || !userId) {
      setIsAdmin(false);
      return;
    }
    setCheckingAdmin(true);
    const { data } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    setIsAdmin(!!data);
    setCheckingAdmin(false);
  };

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) checkAdmin(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user?.id) {
        checkAdmin(session.user.id);
      } else {
        setIsAdmin(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProjects = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProjects(data);
    }
  };

  const fetchClientRequests = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('client_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClientRequests(data);
      if (!selectedReq && data.length > 0) {
        setSelectedReq(data[0]);
        setNewBudget(data[0].budget_estimate ?? '');
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchClientRequests();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedReq || !supabase) return;
    setNewBudget(selectedReq.budget_estimate ?? '');

    const fetchDetails = async () => {
      const { data: msgs } = await supabase
        .from('client_messages')
        .select('*')
        .eq('request_id', selectedReq.id)
        .order('created_at', { ascending: true });
      if (msgs) setReqMessages(msgs);

      const { data: atts } = await supabase
        .from('client_attachments')
        .select('*')
        .eq('request_id', selectedReq.id)
        .order('created_at', { ascending: false });
      if (atts) setReqAttachments(atts);
    };

    fetchDetails();
  }, [selectedReq]);

  const handleUpdateStatus = async (status) => {
    if (!selectedReq || !supabase) return;
    const { error } = await supabase
      .from('client_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', selectedReq.id);

    if (!error) {
      setSelectedReq((prev) => ({ ...prev, status }));
      fetchClientRequests();
      setSuccessMsg('Status da demanda atualizado!');
    }
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    if (!selectedReq || !supabase) return;
    const val = newBudget ? parseFloat(newBudget) : null;
    const { error } = await supabase
      .from('client_requests')
      .update({ budget_estimate: val, updated_at: new Date().toISOString() })
      .eq('id', selectedReq.id);

    if (!error) {
      setSelectedReq((prev) => ({ ...prev, budget_estimate: val }));
      fetchClientRequests();
      setSuccessMsg('Estimativa de orçamento salva com sucesso!');
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedReq || !supabase) return;

    const { data, error } = await supabase
      .from('client_messages')
      .insert({
        request_id: selectedReq.id,
        sender_id: user.id,
        message: replyText.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setReqMessages((prev) => [...prev, data]);
      setReplyText('');
    }
  };

  const handleDownloadAdminAttachment = async (path, filename) => {
    const { data, error } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(path, 120);

    if (error || !data?.signedUrl) {
      alert('Erro ao gerar download do anexo.');
      return;
    }

    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = filename;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setUrl('');
    setGithubUrl('');
    setTags('');
    setImageUrl('');
  };

  const handleStartEdit = (project) => {
    setEditingId(project.id);
    setTitle(project.title ?? '');
    setDescription(project.description ?? '');
    setUrl(project.url ?? '');
    setGithubUrl(project.github_url ?? '');
    setTags((project.tags ?? []).join(', '));
    setImageUrl(project.image_url ?? '');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleDelete = async (id) => {
    setErrorMsg('');
    setSuccessMsg('');
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    if (editingId === id) resetForm();
    setSuccessMsg('Projeto excluído.');
    fetchProjects();
  };

  const handleToggleVisible = async (project) => {
    setErrorMsg('');
    setSuccessMsg('');
    const { error } = await supabase
      .from('projects')
      .update({ visible: !project.visible })
      .eq('id', project.id);
    if (error) {
      setErrorMsg(error.message);
      return;
    }
    fetchProjects();
  };

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
    const payload = {
      title,
      description,
      url,
      github_url: githubUrl,
      tags: tagArray,
      image_url: imageUrl,
    };

    try {
      const { error } = editingId
        ? await supabase.from('projects').update(payload).eq('id', editingId)
        : await supabase.from('projects').insert([{ ...payload, visible: true }]);

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(editingId ? '✏️ Projeto atualizado com sucesso!' : '🎉 Projeto adicionado com SUCESSO no Supabase!');
        resetForm();
        fetchProjects();
      }
    } catch (err) {
      setErrorMsg('Erro ao salvar projeto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} className="admin-page container animate-fade-in">
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
      ) : !isAdmin ? (
        <section className="glass-panel login-card">
          <h1>Acesso Restrito</h1>
          <p>
            Você está conectado como <strong>{user.email}</strong>, mas este e-mail não possui privilégios de administrador.
          </p>
          <div className="form-actions" style={{ flexDirection: 'column', gap: '0.8rem' }}>
            <Link to="/portal" className="btn btn-primary btn-block" style={{ textAlign: 'center' }}>
              Ir para Área do Cliente
            </Link>
            <button onClick={handleLogout} className="btn btn-secondary btn-block">
              Desconectar
            </button>
          </div>
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

          {/* Abas de Navegação Admin */}
          <div className="admin-tabs">
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              Projetos do Portfólio ({projects.length})
            </button>
            <button
              type="button"
              className={`admin-tab-btn ${activeTab === 'clients' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('clients');
                fetchClientRequests();
              }}
            >
              Demandas de Clientes ({clientRequests.length})
            </button>
          </div>

          {activeTab === 'projects' ? (
            <>
              <h2 className="form-title">{editingId ? 'Editar Projeto' : 'Adicionar Novo Projeto'}</h2>
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

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Projeto'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <h2 className="form-title list-title">Projetos Cadastrados</h2>
          {projects.length === 0 ? (
            <p className="empty-list">Nenhum projeto cadastrado ainda.</p>
          ) : (
            <ul className="project-list">
              {projects.map((project) => (
                <li key={project.id} className="project-list-item">
                  <div className="project-list-info">
                    <strong>{project.title}</strong>
                    <span className={`visibility-pill ${project.visible ? 'visible' : 'hidden'}`}>
                      {project.visible ? 'Visível' : 'Oculto'}
                    </span>
                  </div>
                  <div className="project-list-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => handleStartEdit(project)}>
                      Editar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => handleToggleVisible(project)}>
                      {project.visible ? 'Ocultar' : 'Exibir'}
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(project.id)}>
                      Excluir
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        /* Aba de Demandas de Clientes (Épico 3) */
        <div className="client-admin-layout">
          <div className="client-requests-col">
            <h2 className="form-title">Solicitações Recebidas ({clientRequests.length})</h2>
            {clientRequests.length === 0 ? (
              <p className="empty-list">Nenhuma demanda de cliente recebida ainda.</p>
            ) : (
              <div className="client-req-list">
                {clientRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedReq(req)}
                    className={`client-req-card ${selectedReq?.id === req.id ? 'active' : ''}`}
                  >
                    <div className="client-req-header">
                      <span className={`status-pill status-${req.status}`}>
                        {req.status === 'pending' ? 'Pendente' : req.status === 'in_progress' ? 'Em Análise' : 'Concluído'}
                      </span>
                      <span className="client-req-date">
                        {new Date(req.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="client-req-meta">
                      <small>Cliente ID: <code>{req.user_id.slice(0, 8)}...</code></small>
                      <div><strong>Orçamento:</strong> {req.budget_estimate ? `R$ ${req.budget_estimate}` : 'A definir'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="client-details-col">
            {selectedReq ? (
              <div className="client-details-box">
                <header className="req-details-header">
                  <div>
                    <h3>Acompanhar Demanda</h3>
                    <p className="req-id-sub">ID: <code>{selectedReq.id}</code></p>
                  </div>
                  <div className="status-changer">
                    <label>Status:</label>
                    <select
                      value={selectedReq.status}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="admin-select"
                    >
                      <option value="pending">Pendente</option>
                      <option value="in_progress">Em Análise</option>
                      <option value="completed">Concluído</option>
                    </select>
                  </div>
                </header>

                {/* Formulário de Orçamento */}
                <form onSubmit={handleUpdateBudget} className="budget-form">
                  <label>Definir Estimativa de Orçamento (R$):</label>
                  <div className="budget-input-group">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 2500.00"
                      value={newBudget}
                      onChange={(e) => setNewBudget(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary">
                      Salvar Orçamento
                    </button>
                  </div>
                </form>

                {/* Anexos */}
                {reqAttachments.length > 0 && (
                  <div className="admin-attachments">
                    <h4>Anexos do Cliente:</h4>
                    {reqAttachments.map((att) => (
                      <div key={att.id} className="att-item">
                        <span>📎 {att.file_name}</span>
                        <button
                          type="button"
                          className="btn-download-link"
                          onClick={() => handleDownloadAdminAttachment(att.file_path, att.file_name)}
                        >
                          Baixar Anexo
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Conversa 1:1 */}
                <div className="admin-messages-section">
                  <h4>Histórico da Conversa</h4>
                  <div className="admin-msgs-box">
                    {reqMessages.length === 0 ? (
                      <p className="empty-list">Sem mensagens nesta solicitação.</p>
                    ) : (
                      reqMessages.map((m) => {
                        const isYure = m.sender_id === user.id;
                        return (
                          <div key={m.id} className={`admin-msg-bubble ${isYure ? 'admin-me' : 'admin-client'}`}>
                            <div className="msg-sender">{isYure ? 'Yure (Você)' : 'Cliente'}</div>
                            <div className="msg-body">{m.message}</div>
                            <span className="msg-time">{new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <form onSubmit={handleSendAdminReply} className="admin-reply-form">
                    <input
                      type="text"
                      placeholder="Responder ao cliente..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                    />
                    <button type="submit" disabled={!replyText.trim()} className="btn btn-primary">
                      Enviar
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <p className="empty-list">Selecione uma solicitação na lista para visualizar detalhes e mensagens.</p>
            )}
          </div>
        </div>
      )}
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

        .btn-danger {
          background: transparent;
          border: 1px solid rgba(220, 38, 38, 0.4);
          color: #ef4444;
        }

        .btn-danger:hover {
          background: rgba(220, 38, 38, 0.1);
        }

        .form-actions {
          display: flex;
          gap: 0.8rem;
        }

        .list-title {
          margin-top: 2.5rem;
          padding-top: 1.8rem;
          border-top: 1px solid var(--card-border);
        }

        .empty-list {
          opacity: 0.7;
          font-size: 0.9rem;
        }

        .project-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
          list-style: none;
          padding: 0;
        }

        .project-list-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.8rem;
          padding: 0.9rem 1rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
        }

        .project-list-info {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }

        .visibility-pill {
          font-size: 0.75rem;
          font-family: var(--font-mono);
          padding: 0.15rem 0.55rem;
          border-radius: 20px;
        }

        .visibility-pill.visible {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
        }

        .visibility-pill.hidden {
          background: rgba(0, 0, 0, 0.08);
          opacity: 0.8;
        }

        .project-list-actions {
          display: flex;
          gap: 0.5rem;
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

        /* Abas Admin */
        .admin-tabs {
          display: flex;
          gap: 0.8rem;
          margin-bottom: 2rem;
          border-bottom: 1px solid var(--card-border);
          padding-bottom: 0.8rem;
        }

        .admin-tab-btn {
          background: transparent;
          border: 1px solid var(--card-border);
          color: var(--text-color);
          padding: 0.6rem 1.2rem;
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .admin-tab-btn.active {
          background: var(--accent-color);
          color: #fff;
          border-color: var(--accent-color);
        }

        /* Layout de Demandas de Clientes */
        .client-admin-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 1.5rem;
          align-items: flex-start;
        }

        @media (max-width: 768px) {
          .client-admin-layout {
            grid-template-columns: 1fr;
          }
        }

        .client-req-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .client-req-card {
          padding: 0.85rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
          cursor: pointer;
          background: rgba(0, 0, 0, 0.02);
          transition: all var(--transition-fast);
        }

        .client-req-card.active {
          border-color: var(--accent-color);
          background: rgba(30, 67, 149, 0.08);
        }

        .client-req-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
        }

        .client-req-date {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .client-req-meta {
          font-size: 0.85rem;
        }

        .status-pill {
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
        }

        .status-pending { background: #ffc107; color: #000; }
        .status-in_progress { background: #17a2b8; color: #fff; }
        .status-completed { background: #28a745; color: #fff; }

        .client-details-box {
          border: 1px solid var(--card-border);
          border-radius: var(--radius-sm);
          padding: 1.2rem;
          background: rgba(0, 0, 0, 0.02);
        }

        .req-details-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
          padding-bottom: 0.8rem;
          border-bottom: 1px solid var(--card-border);
        }

        .req-id-sub {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .status-changer {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .admin-select {
          padding: 0.35rem 0.6rem;
          border-radius: var(--radius-sm);
          border: 1px solid var(--card-border);
          background: var(--card-bg);
          color: var(--text-color);
        }

        .budget-form {
          margin-bottom: 1.2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--card-border);
        }

        .budget-input-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.4rem;
        }

        .admin-attachments {
          margin-bottom: 1.2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid var(--card-border);
        }

        .att-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.4rem 0.6rem;
          background: rgba(0, 0, 0, 0.04);
          border-radius: var(--radius-sm);
          margin-top: 0.4rem;
          font-size: 0.85rem;
        }

        .btn-download-link {
          background: transparent;
          border: none;
          color: var(--accent-color);
          cursor: pointer;
          font-weight: 600;
          text-decoration: underline;
        }

        .admin-messages-section h4 {
          margin-bottom: 0.6rem;
          font-size: 0.95rem;
        }

        .admin-msgs-box {
          max-height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          padding: 0.8rem;
          background: rgba(0, 0, 0, 0.03);
          border-radius: var(--radius-sm);
          margin-bottom: 0.8rem;
        }

        .admin-msg-bubble {
          max-width: 85%;
          padding: 0.6rem 0.9rem;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }

        .admin-me {
          align-self: flex-end;
          background: var(--accent-color);
          color: #fff;
        }

        .admin-client {
          align-self: flex-start;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
        }

        .msg-sender {
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          opacity: 0.8;
          margin-bottom: 0.2rem;
        }

        .msg-time {
          display: block;
          font-size: 0.6rem;
          opacity: 0.7;
          text-align: right;
          margin-top: 0.2rem;
        }

        .admin-reply-form {
          display: flex;
          gap: 0.5rem;
        }

        .admin-reply-form input {
          flex: 1;
        }
      `}</style>
    </main>
  );
}
