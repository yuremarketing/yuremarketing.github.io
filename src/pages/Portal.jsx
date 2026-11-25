import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.zip'];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

export function Portal() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMsg, setAuthMsg] = useState({ text: '', type: '' });

  // Dashboard do cliente
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [messages, setMessages] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // Formulário de nova solicitação
  const [showNewForm, setShowNewForm] = useState(false);
  const [newStatusMsg, setNewStatusMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileErrorMsg, setFileErrorMsg] = useState('');
  const [downloadErrorMsg, setDownloadErrorMsg] = useState('');

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

  const fetchRequests = async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase
      .from('client_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRequests(data);
      if (!selectedRequest && data.length > 0) {
        setSelectedRequest(data[0]);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  useEffect(() => {
    if (!selectedRequest || !supabase) return;

    // Buscar mensagens da solicitação selecionada
    const fetchMessages = async () => {
      const { data } = await supabase
        .from('client_messages')
        .select('*')
        .eq('request_id', selectedRequest.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    };

    // Buscar anexos
    const fetchAttachments = async () => {
      const { data } = await supabase
        .from('client_attachments')
        .select('*')
        .eq('request_id', selectedRequest.id)
        .order('created_at', { ascending: false });
      if (data) setAttachments(data);
    };

    fetchMessages();
    fetchAttachments();
  }, [selectedRequest]);

  const handleMagicLink = async (e) => {
    e.preventDefault();
    if (!email) return;

    setAuthLoading(true);
    setAuthMsg({ text: '', type: '' });

    try {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setAuthMsg({ text: error.message, type: 'error' });
      } else {
        setAuthMsg({
          text: 'Link de acesso seguro enviado! Verifique seu e-mail para acessar sem senha.',
          type: 'success',
        });
      }
    } catch (err) {
      setAuthMsg({ text: 'Falha ao solicitar link de acesso.', type: 'error' });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRequests([]);
    setSelectedRequest(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setFileErrorMsg('');
      return;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setFileErrorMsg(`Extensão não permitida. Permitidos: ${ALLOWED_EXTENSIONS.join(', ')}`);
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileErrorMsg('O arquivo ultrapassa o limite máximo de 15MB.');
      e.target.value = '';
      setSelectedFile(null);
      return;
    }

    setFileErrorMsg('');
    setSelectedFile(file);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!reqDescription.trim()) return;

    setSubmitting(true);
    setNewStatusMsg('');
    setFileErrorMsg('');

    try {
      // 1. Criar client_request
      const { data: requestData, error: reqError } = await supabase
        .from('client_requests')
        .insert({
          user_id: user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (reqError) throw reqError;

      const requestId = requestData.id;

      // 2. Mensagem inicial
      const initialText = reqTitle ? `**${reqTitle}**\n\n${reqDescription}` : reqDescription;
      await supabase.from('client_messages').insert({
        request_id: requestId,
        sender_id: user.id,
        message: initialText,
      });

      // 3. Upload de arquivo se houver
      if (selectedFile) {
        const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${user.id}/${requestId}/${cleanName}`;

        const { error: uploadError } = await supabase.storage
          .from('client-assets')
          .upload(storagePath, selectedFile);

        if (!uploadError) {
          await supabase.from('client_attachments').insert({
            request_id: requestId,
            file_path: storagePath,
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            uploaded_by: user.id,
          });
        }
      }

      setReqTitle('');
      setReqDescription('');
      setSelectedFile(null);
      setShowNewForm(false);
      setNewStatusMsg('Solicitação criada com sucesso!');
      await fetchRequests();
      setSelectedRequest(requestData);
    } catch (err) {
      setNewStatusMsg(`Erro ao criar solicitação: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRequest) return;

    const { data, error } = await supabase
      .from('client_messages')
      .insert({
        request_id: selectedRequest.id,
        sender_id: user.id,
        message: newMessage.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
    }
  };

  const handleDownloadAttachment = async (path, filename) => {
    setDownloadErrorMsg('');
    const { data, error } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(path, 120);

    if (error || !data?.signedUrl) {
      setDownloadErrorMsg('Não foi possível gerar link de download.');
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

  // Se o visitante não está autenticado
  if (!user) {
    return (
      <main id="main-content" tabIndex={-1} className="portal-container container">
        <section className="portal-auth-card">
          <header className="portal-auth-header">
            <span className="portal-badge">Área do Cliente</span>
            <h1 className="portal-title">Acesso Seguro via Magic Link</h1>
            <p className="portal-subtitle">
              Entre com seu e-mail para acompanhar orçamentos, trocar mensagens e compartilhar arquivos com o Yure.
            </p>
          </header>

          <form onSubmit={handleMagicLink} className="portal-auth-form">
            <div className="form-group">
              <label htmlFor="client-email" className="form-label">Seu E-mail Corporativo ou Pessoal</label>
              <input
                id="client-email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="portal-input"
              />
            </div>

            <button type="submit" disabled={authLoading} className="portal-btn-primary">
              {authLoading ? 'Enviando link...' : 'Receber Magic Link por E-mail'}
            </button>
          </form>

          {authMsg.text && (
            <div role="alert" className={`portal-alert ${authMsg.type === 'error' ? 'portal-alert-error' : 'portal-alert-success'}`}>
              {authMsg.text}
            </div>
          )}
        </section>

        <style>{portalStyles}</style>
      </main>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="portal-container container">
      <header className="portal-dashboard-header">
        <div>
          <span className="portal-badge">Área Privada</span>
          <h1 className="portal-dashboard-title">Minhas Demandas & Orçamentos</h1>
          <p className="portal-user-meta">Conectado como <strong>{user.email}</strong></p>
        </div>
        <div className="header-actions">
          <button onClick={() => setShowNewForm(!showNewForm)} className="portal-btn-secondary">
            {showNewForm ? 'Fechar Formulário' : '+ Nova Solicitação'}
          </button>
          <button onClick={handleSignOut} className="portal-btn-logout">
            Sair
          </button>
        </div>
      </header>

      {newStatusMsg && (
        <div role="status" className="portal-alert portal-alert-success" style={{ marginBottom: '1.5rem' }}>
          {newStatusMsg}
        </div>
      )}

      {showNewForm && (
        <section className="portal-card new-request-card">
          <h2 className="section-title">Abrir Nova Solicitação de Orçamento</h2>
          <form onSubmit={handleCreateRequest} className="new-request-form">
            <div className="form-group">
              <label htmlFor="portal-req-title" className="form-label">Título do Projeto</label>
              <input
                id="portal-req-title"
                type="text"
                placeholder="Ex: Landing Page para Consultoria / App Mobile"
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value)}
                className="portal-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="portal-req-desc" className="form-label">Descrição do Escopo / Necessidade *</label>
              <textarea
                id="portal-req-desc"
                required
                rows={4}
                placeholder="Descreva detalhes, objetivos, prazos ou tecnologias esperadas..."
                value={reqDescription}
                onChange={(e) => setReqDescription(e.target.value)}
                className="portal-textarea"
              />
            </div>

            <div className="form-group">
              <label htmlFor="portal-file-upload" className="form-label">Anexar Briefing ou Imagem de Referência (Opcional, max 15MB)</label>
              <small id="portal-file-hint" className="form-hint">Formatos aceitos: PDF, PNG, JPG, ZIP.</small>
              <input
                id="portal-file-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.zip"
                aria-describedby="portal-file-hint"
                onChange={handleFileChange}
                className="portal-file-input"
              />
              {fileErrorMsg && (
                <div role="alert" className="portal-alert portal-alert-error" style={{ marginTop: '0.6rem' }}>
                  {fileErrorMsg}
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting} className="portal-btn-primary">
              {submitting ? 'Enviando...' : 'Submeter Solicitação'}
            </button>
          </form>
        </section>
      )}

      <div className="portal-grid">
        {/* Painel Esquerdo: Lista de Solicitações */}
        <section className="portal-card requests-sidebar">
          <h2 className="section-title">Minhas Demandas ({requests.length})</h2>
          {requests.length === 0 ? (
            <p className="empty-text">Nenhuma solicitação aberta ainda. Clique em "+ Nova Solicitação" para começar.</p>
          ) : (
            <ul className="requests-list">
              {requests.map((req) => (
                <li
                  key={req.id}
                  onClick={() => {
                    setDownloadErrorMsg('');
                    setSelectedRequest(req);
                  }}
                  className={`request-item ${selectedRequest?.id === req.id ? 'active' : ''}`}
                >
                  <div className="request-item-top">
                    <span className={`status-pill status-${req.status}`}>
                      {req.status === 'pending' ? 'Pendente' : req.status === 'in_progress' ? 'Em Análise' : 'Concluído'}
                    </span>
                    <span className="request-date">
                      {new Date(req.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="request-budget-row">
                    <strong>Orçamento:</strong> {req.budget_estimate ? `R$ ${req.budget_estimate}` : 'Aguardando estimativa'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Painel Direito: Detalhes e Mensagens */}
        <section className="portal-card request-details">
          {selectedRequest ? (
            <>
              <header className="details-header">
                <div>
                  <h2 className="section-title">Acompanhamento da Solicitação</h2>
                  <p className="request-id-meta">ID: <code>{selectedRequest.id}</code></p>
                </div>
                <span className={`status-pill status-${selectedRequest.status}`}>
                  {selectedRequest.status === 'pending' ? 'Pendente' : selectedRequest.status === 'in_progress' ? 'Em Análise' : 'Concluído'}
                </span>
              </header>

              {/* Anexos */}
              {attachments.length > 0 && (
                <div className="attachments-section">
                  <h3 className="sub-title">Documentos e Briefings Anexados</h3>
                  <div className="attachments-list">
                    {attachments.map((att) => (
                      <div key={att.id} className="attachment-badge">
                        <span>📎 {att.file_name}</span>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(att.file_path, att.file_name)}
                          className="btn-download"
                        >
                          Baixar
                        </button>
                      </div>
                    ))}
                  </div>
                  {downloadErrorMsg && (
                    <div role="alert" className="portal-alert portal-alert-error" style={{ marginTop: '0.6rem' }}>
                      {downloadErrorMsg}
                    </div>
                  )}
                </div>
              )}

              {/* Thread de Mensagens */}
              <div className="chat-messages-container">
                <h3 className="sub-title">Comunicação 1:1</h3>
                <div className="messages-box">
                  {messages.length === 0 ? (
                    <p className="empty-text">Nenhuma mensagem registrada.</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user.id;
                      return (
                        <div key={msg.id} className={`message-bubble ${isMe ? 'message-me' : 'message-yure'}`}>
                          <div className="message-author">{isMe ? 'Você' : 'Yure'}</div>
                          <div className="message-content">{msg.message}</div>
                          <span className="message-time">
                            {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="send-message-form">
                  <input
                    type="text"
                    placeholder="Escreva uma mensagem ou dúvida..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="portal-input message-input"
                  />
                  <button type="submit" disabled={!newMessage.trim()} className="portal-btn-primary">
                    Enviar
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="empty-details">
              <p>Selecione uma solicitação ao lado para ver a conversa e anexos.</p>
            </div>
          )}
        </section>
      </div>

      <style>{portalStyles}</style>
    </main>
  );
}

const portalStyles = `
  .portal-container {
    padding: 2.5rem 1rem 4rem;
  }

  .portal-auth-card {
    max-width: 520px;
    margin: 3rem auto;
    padding: 2.5rem;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    backdrop-filter: var(--backdrop-blur);
    box-shadow: var(--shadow-lg);
  }

  .portal-badge {
    display: inline-block;
    padding: 0.25rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 9999px;
    background: rgba(30, 67, 149, 0.15);
    color: var(--accent-color);
    margin-bottom: 0.8rem;
  }

  .portal-title {
    font-size: 1.6rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .portal-subtitle {
    font-size: 0.95rem;
    opacity: 0.8;
    line-height: 1.45;
    margin-bottom: 1.5rem;
  }

  .portal-dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
    padding-bottom: 1.2rem;
    border-bottom: 1px solid var(--card-border);
    flex-wrap: wrap;
    gap: 1rem;
  }

  .portal-dashboard-title {
    font-size: 1.8rem;
    font-weight: 700;
  }

  .portal-user-meta {
    font-size: 0.9rem;
    opacity: 0.8;
    margin-top: 0.3rem;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .portal-btn-primary {
    background: var(--accent-color);
    color: #ffffff;
    border: none;
    padding: 0.75rem 1.4rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
    transition: opacity var(--transition-fast);
  }

  .portal-btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .portal-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .portal-btn-secondary {
    background: transparent;
    border: 1px solid var(--card-border);
    color: var(--text-color);
    padding: 0.65rem 1.2rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .portal-btn-logout {
    background: transparent;
    border: 1px solid rgba(220, 53, 69, 0.4);
    color: #e55353;
    padding: 0.65rem 1.2rem;
    border-radius: var(--radius-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .portal-btn-logout:hover {
    background: rgba(220, 53, 69, 0.1);
  }

  .portal-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    backdrop-filter: var(--backdrop-blur);
  }

  .new-request-card {
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1.2rem;
  }

  .form-label {
    display: block;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 0.4rem;
  }

  .form-hint {
    display: block;
    font-size: 0.75rem;
    opacity: 0.7;
    margin-top: 0.3rem;
  }

  .portal-input, .portal-textarea {
    width: 100%;
    padding: 0.75rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--card-border);
    background: rgba(0, 0, 0, 0.04);
    color: var(--text-color);
    font-family: inherit;
    font-size: 0.95rem;
  }

  [data-theme="dark"] .portal-input,
  [data-theme="dark"] .portal-textarea {
    background: rgba(255, 255, 255, 0.05);
  }

  .portal-grid {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 860px) {
    .portal-grid {
      grid-template-columns: 1fr;
    }
  }

  .section-title {
    font-size: 1.15rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }

  .sub-title {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  .requests-list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .request-item {
    padding: 0.85rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--card-border);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .request-item:hover {
    background: rgba(0, 0, 0, 0.03);
  }

  [data-theme="dark"] .request-item:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .request-item.active {
    border-color: var(--accent-color);
    background: rgba(30, 67, 149, 0.08);
  }

  .request-item-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4rem;
  }

  .request-date {
    font-size: 0.75rem;
    opacity: 0.7;
  }

  .request-budget-row {
    font-size: 0.85rem;
    opacity: 0.9;
  }

  .status-pill {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    padding: 0.2rem 0.5rem;
    border-radius: 9999px;
  }

  .status-pending {
    background: #ffc107;
    color: #000;
  }

  .status-in_progress {
    background: #17a2b8;
    color: #fff;
  }

  .status-completed {
    background: #28a745;
    color: #fff;
  }

  .details-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--card-border);
    margin-bottom: 1.2rem;
  }

  .request-id-meta {
    font-size: 0.8rem;
    opacity: 0.7;
  }

  .attachments-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--card-border);
  }

  .attachments-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .attachment-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0.8rem;
    background: rgba(0, 0, 0, 0.04);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-sm);
    font-size: 0.85rem;
  }

  [data-theme="dark"] .attachment-badge {
    background: rgba(255, 255, 255, 0.05);
  }

  .btn-download {
    background: transparent;
    border: none;
    color: var(--accent-color);
    font-weight: 600;
    cursor: pointer;
    font-size: 0.8rem;
    text-decoration: underline;
  }

  .messages-box {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-height: 380px;
    overflow-y: auto;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.02);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
  }

  [data-theme="dark"] .messages-box {
    background: rgba(0, 0, 0, 0.2);
  }

  .message-bubble {
    max-width: 80%;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .message-me {
    align-self: flex-end;
    background: var(--accent-color);
    color: #fff;
    border-bottom-right-radius: 2px;
  }

  .message-yure {
    align-self: flex-start;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-bottom-left-radius: 2px;
  }

  .message-author {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
    opacity: 0.8;
  }

  .message-time {
    display: block;
    font-size: 0.65rem;
    opacity: 0.7;
    margin-top: 0.35rem;
    text-align: right;
  }

  .send-message-form {
    display: flex;
    gap: 0.5rem;
  }

  .message-input {
    flex: 1;
  }

  .portal-alert {
    padding: 0.85rem 1.2rem;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
    margin-top: 1rem;
  }

  .portal-alert-success {
    background: rgba(40, 167, 69, 0.15);
    color: #28a745;
    border: 1px solid rgba(40, 167, 69, 0.3);
  }

  .portal-alert-error {
    background: rgba(220, 53, 69, 0.15);
    color: #e55353;
    border: 1px solid rgba(220, 53, 69, 0.3);
  }

  .empty-text, .empty-details {
    font-size: 0.9rem;
    opacity: 0.7;
    text-align: center;
    padding: 2rem 1rem;
  }
`;
