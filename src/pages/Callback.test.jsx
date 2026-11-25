import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Callback } from './Callback';

function renderCallback(search) {
  return render(
    <MemoryRouter initialEntries={[`/callback${search}`]}>
      <Routes>
        <Route path="/callback" element={<Callback />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Callback (Issue #23 — OAuth real do LinkedIn)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejeita quando o state retornado não bate com o guardado (proteção contra CSRF)', async () => {
    sessionStorage.setItem('linkedin_oauth_state', 'state-correto');

    renderCallback('?code=abc123&state=state-forjado');

    expect(await screen.findByText(/Sessão de login inválida ou expirada/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('linkedin_oauth_state')).toBeNull();
  });

  it('rejeita quando não há state salvo (sessão nunca iniciada por About.jsx)', async () => {
    renderCallback('?code=abc123&state=qualquer');

    expect(await screen.findByText(/Sessão de login inválida ou expirada/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('troca o code pelo perfil real via Edge Function quando o state bate', async () => {
    sessionStorage.setItem('linkedin_oauth_state', 'state-correto');
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: 'Yure Mark', email: 'yure@example.com', picture: 'https://x/pic.jpg' }),
    });

    renderCallback('?code=abc123&state=state-correto');

    expect(await screen.findByText(/Perfil do LinkedIn conectado com sucesso/i)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({
      code: 'abc123',
      redirect_uri: expect.stringContaining('/callback'),
    });
    expect(JSON.parse(localStorage.getItem('linkedin_profile'))).toEqual({
      name: 'Yure Mark',
      email: 'yure@example.com',
      picture: 'https://x/pic.jpg',
    });
  });

  it('mostra erro amigável quando a Edge Function falha (sem travar em "Processando" pra sempre)', async () => {
    sessionStorage.setItem('linkedin_oauth_state', 'state-correto');
    global.fetch.mockResolvedValue({ ok: false });

    renderCallback('?code=abc123&state=state-correto');

    expect(await screen.findByText(/Não foi possível concluir o login com o LinkedIn/i)).toBeInTheDocument();
  });

  it('mostra mensagem quando o LinkedIn retorna erro na URL', async () => {
    renderCallback('?error=access_denied');

    expect(await screen.findByText(/Erro na autenticação: access_denied/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('mostra mensagem quando não há código de autorização', async () => {
    renderCallback('');

    expect(await screen.findByText(/Nenhum código de autorização encontrado/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
