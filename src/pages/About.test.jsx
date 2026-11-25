import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { About } from './About';

describe('About (Issue #23 — OAuth real do LinkedIn)', () => {
  let originalLocation;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.stubEnv('VITE_LINKEDIN_CLIENT_ID', 'test-client-id');
    originalLocation = window.location;
    delete window.location;
    window.location = { origin: 'https://yuremarketing.github.io', href: '' };
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.unstubAllEnvs();
  });

  it('gera um state com entropia real (crypto.randomUUID), salva em sessionStorage e inclui o mesmo valor na URL de autorização', () => {
    render(<About />);

    const loginBtn = screen.getByRole('button', { name: /Conectar com LinkedIn/i });
    fireEvent.click(loginBtn);

    const savedState = sessionStorage.getItem('linkedin_oauth_state');
    expect(savedState).toMatch(/^[0-9a-f-]{36}$/i);
    expect(window.location.href).toContain(`state=${savedState}`);
    expect(window.location.href).toContain('https://www.linkedin.com/oauth/v2/authorization');
  });

  it('exibe só os campos reais do perfil (nome + foto) quando conectado, sem fabricar headline/summary', () => {
    localStorage.setItem(
      'linkedin_profile',
      JSON.stringify({ name: 'Yure Mark', email: 'yure@example.com', picture: 'https://x/pic.jpg' })
    );

    render(<About />);

    expect(screen.getByText('Yure Mark')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Yure Mark' })).toHaveAttribute('src', 'https://x/pic.jpg');
    expect(screen.getByText(/LinkedIn Conectado/i)).toBeInTheDocument();
    // Resumo Profissional é sempre o texto estático, nunca um campo inventado do LinkedIn
    expect(screen.getByText(/criador por trás do portfólio/i)).toBeInTheDocument();
  });
});
