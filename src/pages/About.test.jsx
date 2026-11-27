import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { About } from './About';

describe('About (Issue #23 — Link direto para o LinkedIn)', () => {
  it('renderiza a bio e o link direto seguro para a página do LinkedIn sem OAuth', () => {
    render(<About />);

    expect(screen.getByRole('heading', { name: /01\.\s*sobre_mim\(\)/i })).toBeInTheDocument();
    expect(screen.getByText(/criador por trás do portfólio/i)).toBeInTheDocument();

    const linkedinLink = screen.getByRole('link', { name: /Visitar LinkedIn/i });
    expect(linkedinLink).toHaveAttribute('href', 'https://www.linkedin.com/company/yure-marketing');
    expect(linkedinLink).toHaveAttribute('target', '_blank');
    expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer');

    expect(screen.queryByRole('button', { name: /Conectar com LinkedIn/i })).not.toBeInTheDocument();
  });
});
