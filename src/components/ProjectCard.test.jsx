import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from './ProjectCard';

describe('ProjectCard Component', () => {
  const shortProject = {
    id: '1',
    title: 'Projeto Teste',
    description: 'Descrição curta do projeto.',
    url: 'https://exemplo.com',
    github_url: 'https://github.com/exemplo/repo',
    tags: ['React', 'CSS'],
    image_url: 'https://exemplo.com/imagem.png',
  };

  const longProject = {
    id: '2',
    title: 'Projeto Longo',
    description:
      'Esta é uma descrição extremamente longa e detalhada sobre o projeto, projetada especificamente para testar o comportamento do line-clamp e verificar se o botão interativo de expansão e retração funciona perfeitamente sem quebrar a harmonia visual da vitrine de projetos.',
    url: 'https://exemplo.com',
    github_url: 'https://github.com/exemplo/repo',
    tags: ['AI', 'Python', 'Docker'],
    image_url: 'https://exemplo.com/imagem2.png',
  };

  it('renderiza o título, tags e links do projeto', () => {
    render(<ProjectCard project={shortProject} />);
    expect(screen.getByText('Projeto Teste')).toBeInTheDocument();
    expect(screen.getByText('Descrição curta do projeto.')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('CSS')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver Projeto/i })).toHaveAttribute('href', 'https://exemplo.com');
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute('href', 'https://github.com/exemplo/repo');
  });

  it('aplica a classe clamped inicialmente na descrição', () => {
    render(<ProjectCard project={longProject} />);
    const desc = screen.getByText(/Esta é uma descrição extremamente longa/i);
    expect(desc).toHaveClass('clamped');
  });

  it('expande e retrai a descrição ao clicar no botão Ler mais / Ver menos quando há overflow', () => {
    // Simula overflow simulando scrollHeight > clientHeight
    const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
    const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');

    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 200 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 80 });

    render(<ProjectCard project={longProject} />);

    const toggleBtn = screen.getByRole('button', { name: /Ler mais/i });
    expect(toggleBtn).toBeInTheDocument();

    // Expande
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Ver menos/i)).toBeInTheDocument();
    const desc = screen.getByText(/Esta é uma descrição extremamente longa/i);
    expect(desc).not.toHaveClass('clamped');

    // Retrai
    fireEvent.click(screen.getByText(/Ver menos/i));
    expect(screen.getByText(/Ler mais/i)).toBeInTheDocument();
    expect(desc).toHaveClass('clamped');

    // Restaura propriedades
    if (originalScrollHeight) Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
    if (originalClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
  });
});
