import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../hooks/useTheme';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { AssistantLauncher } from './assistant/AssistantLauncher';

describe('Navbar, Footer & Identidade Visual (Issues #28 / Turno 27)', () => {
  it('esconde o link Admin da navegação pública, exibe a logo oficial e marca a página atual com aria-current="page"', () => {
    const { container } = render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/about']}>
          <Navbar />
        </MemoryRouter>
      </ThemeProvider>
    );

    const nav = screen.getByRole('navigation', { name: /Principal/i });
    expect(nav).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument();

    const logoImg = container.querySelector('img.logo-mark');
    expect(logoImg).toHaveAttribute('src', '/images/logo-yuremarketing.png');

    const aboutLink = screen.getByRole('link', { name: /Sobre Mim/i });
    expect(aboutLink).toHaveAttribute('aria-current', 'page');

    const homeLink = screen.getByRole('link', { name: /Projetos/i });
    expect(homeLink).not.toHaveAttribute('aria-current');
  });

  it('renderiza Footer semântico com logo oficial e links diretos de WhatsApp, e-mail, LinkedIn e GitHub', () => {
    const { container } = render(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(container.querySelector('img.footer-logo-mark')).toHaveAttribute('src', '/images/logo-yuremarketing.png');

    const whatsappLink = screen.getByRole('link', { name: /WhatsApp/i });
    expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/5561994085093');

    const emailLink = screen.getByRole('link', { name: /yure\.mark@gmail\.com/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:yure.mark@gmail.com');

    const linkedinLink = screen.getByRole('link', { name: /LinkedIn/i });
    expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/company/yure-marketing');

    const githubLink = screen.getByRole('link', { name: /GitHub/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/yuremarketing');
  });

  it('renderiza o avatar futurista no botão do Assistente quando fechado', () => {
    const { container } = render(<AssistantLauncher open={false} onClick={() => {}} />);
    const avatarImg = container.querySelector('img.assistant-launcher-avatar');
    expect(avatarImg).toHaveAttribute('src', '/images/assistant-avatar.jpg');
  });
});
