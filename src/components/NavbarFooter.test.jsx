import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../hooks/useTheme';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

describe('Navbar & Footer (Issue #28)', () => {
  it('esconde o link Admin da navegação pública e marca a página atual com aria-current="page"', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/about']}>
          <Navbar />
        </MemoryRouter>
      </ThemeProvider>
    );

    const nav = screen.getByRole('navigation', { name: /Principal/i });
    expect(nav).toBeInTheDocument();

    expect(screen.queryByRole('link', { name: /Admin/i })).not.toBeInTheDocument();

    const aboutLink = screen.getByRole('link', { name: /Sobre Mim/i });
    expect(aboutLink).toHaveAttribute('aria-current', 'page');

    const homeLink = screen.getByRole('link', { name: /Projetos/i });
    expect(homeLink).not.toHaveAttribute('aria-current');
  });

  it('renderiza Footer semântico com links diretos de WhatsApp, e-mail, LinkedIn e GitHub', () => {
    render(<Footer />);

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    const whatsappLink = screen.getByRole('link', { name: /WhatsApp/i });
    expect(whatsappLink).toHaveAttribute('href', 'https://wa.me/5561994085093');

    const emailLink = screen.getByRole('link', { name: /yure\.mark@gmail\.com/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:yure.mark@gmail.com');

    const linkedinLink = screen.getByRole('link', { name: /LinkedIn/i });
    expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/company/yure-marketing');

    const githubLink = screen.getByRole('link', { name: /GitHub/i });
    expect(githubLink).toHaveAttribute('href', 'https://github.com/yuremarketing');
  });
});
