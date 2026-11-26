import { describe, it, expect } from 'vitest';
import {
  ASSISTANT_CONTACT_CHANNELS,
  buildOfflineFallback,
  matchAssistantFaq,
  normalizeQuestion,
} from './assistantFaq';

describe('assistantFaq (Issue #35)', () => {
  it('normaliza acentos, caixa alta e pontuação corretamente', () => {
    expect(normalizeQuestion('  Olá!!! Qual É o WhatsApp do Yure?  ')).toBe('ola qual e o whatsapp do yure');
  });

  it('responde perguntas de contato sem chamar LLM com todos os canais homologados', () => {
    const queries = [
      'Como falo com ele diretamente?',
      'Qual seu WhatsApp?',
      'Qual o e-mail de contato?',
      'Tem LinkedIn ou GitHub?',
    ];

    for (const q of queries) {
      const hit = matchAssistantFaq(q);
      expect(hit).not.toBeNull();
      expect(hit.category).toBe('contact');
      expect(hit.answer).toContain(ASSISTANT_CONTACT_CHANNELS.whatsappDisplay);
      expect(hit.answer).toContain(ASSISTANT_CONTACT_CHANNELS.email);
      expect(hit.answer).toContain(ASSISTANT_CONTACT_CHANNELS.linkedinUrl);
      expect(hit.answer).toContain(ASSISTANT_CONTACT_CHANNELS.githubUrl);
    }
  });

  it('responde perguntas gerais de stack, mas delega perguntas sobre projeto específico para a LLM', () => {
    const stackHit = matchAssistantFaq('Qual stack ele usa?');
    expect(stackHit).not.toBeNull();
    expect(stackHit.category).toBe('stack');
    expect(stackHit.answer).toContain('React');
    expect(stackHit.answer).toContain('Supabase');

    expect(matchAssistantFaq('Qual a stack do projeto de e-commerce?')).toBeNull();
  });

  it('responde saudações curtas, resumo sobre o Yure e dúvidas de LGPD/privacidade', () => {
    expect(matchAssistantFaq('Oi!')?.category).toBe('greeting');
    expect(matchAssistantFaq('Bom dia')?.category).toBe('greeting');
    expect(matchAssistantFaq('Quem é você?')?.category).toBe('greeting');

    const aboutHit = matchAssistantFaq('Quem é o Yure?');
    expect(aboutHit?.category).toBe('about');
    expect(aboutHit?.answer).toContain('Yure Mark');

    const privacyHit = matchAssistantFaq('Vocês salvam esta conversa? Como funciona a LGPD?');
    expect(privacyHit?.category).toBe('privacy');
    expect(privacyHit?.answer).toContain(ASSISTANT_CONTACT_CHANNELS.email);
  });

  it('não sequestra perguntas abertas, dinâmicas ou longas (>140 chars)', () => {
    expect(matchAssistantFaq('Quais projetos ele já lançou?')).toBeNull();
    expect(matchAssistantFaq('Como ele organiza testes automatizados em produção?')).toBeNull();
    expect(
      matchAssistantFaq(
        'Oi, estou analisando vários perfis para uma vaga sênior de engenharia de software e gostaria de saber quais projetos complexos o Yure liderou recentemente e qual foi o impacto nos clientes.'
      )
    ).toBeNull();
  });

  it('buildOfflineFallback reaproveita FAQ relaxado quando possível e sempre inclui canais úteis', () => {
    const relaxedStack = buildOfflineFallback(
      'Estou avaliando o perfil com calma e queria entender em detalhes qual stack o Yure usa no dia a dia em produção nos sistemas dele.'
    );
    expect(relaxedStack).toContain('React');
    expect(relaxedStack).toContain('temporariamente instável');

    const genericFallback = buildOfflineFallback('Quais projetos ele já lançou?');
    expect(genericFallback).toContain('temporariamente indisponível');
    expect(genericFallback).toContain(ASSISTANT_CONTACT_CHANNELS.whatsappDisplay);
    expect(genericFallback).toContain(ASSISTANT_CONTACT_CHANNELS.email);
  });
});
