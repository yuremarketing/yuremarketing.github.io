export const ASSISTANT_CONTACT_CHANNELS = Object.freeze({
  whatsappDisplay: '+55 61 99408-5093',
  whatsappUrl: 'https://wa.me/5561994085093',
  email: 'yure.mark@gmail.com',
  linkedinUrl: 'https://www.linkedin.com/company/yure-marketing',
  githubUrl: 'https://github.com/yuremarketing',
});

export const MAX_FAQ_LENGTH = 140;

export function normalizeQuestion(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const CONTACT_ANSWER = [
  'Você pode falar direto com o Yure pelos canais oficiais:',
  `• WhatsApp: ${ASSISTANT_CONTACT_CHANNELS.whatsappDisplay} (${ASSISTANT_CONTACT_CHANNELS.whatsappUrl})`,
  `• E-mail: ${ASSISTANT_CONTACT_CHANNELS.email}`,
  `• LinkedIn: ${ASSISTANT_CONTACT_CHANNELS.linkedinUrl}`,
  `• GitHub: ${ASSISTANT_CONTACT_CHANNELS.githubUrl}`,
  '',
  'Se preferir, também pode clicar em "Deixar contato pro Yure" aqui no chat para receber retorno por e-mail.',
].join('\n');

const STACK_ANSWER = [
  'A stack principal do Yure nos projetos do portfólio inclui:',
  '• Front-end: React, Vite, JavaScript/TypeScript e Vanilla CSS (com variáveis CSS e suporte a tema claro/escuro).',
  '• Back-end & Dados: Supabase (PostgreSQL, Auth, RLS, Storage e Edge Functions em Deno).',
  '• Engenharia de IA & Infra: agentes de IA, integração com LLMs, servidores MCP, Docker e CI/CD via GitHub Actions.',
].join('\n');

const ABOUT_ANSWER =
  'O Yure Mark é o engenheiro de software por trás do portfólio yuremarketing. Ele desenvolve aplicações web modernas, arquiteturas escaláveis, agentes de IA e automações sob medida para negócios.';

const PRIVACY_ANSWER = [
  'Por padrão, esta conversa vive apenas na memória do seu navegador e some quando você recarrega a página — o histórico não é salvo no banco.',
  `Nome e e-mail só são coletados se você optar por deixar contato. Para dúvidas ou pedidos ligados à LGPD, fale em ${ASSISTANT_CONTACT_CHANNELS.email} ou WhatsApp ${ASSISTANT_CONTACT_CHANNELS.whatsappDisplay}.`,
].join('\n');

const GREETING_ANSWER =
  'Olá! Sou o assistente do portfólio do Yure Mark. Posso ajudar com informações sobre os projetos dele, stack tecnológica ou canais diretos de contato. O que você gostaria de saber?';

const PRIVACY_REGEX =
  /\b(lgpd|privacidade|politica de privacidade|guarda(r|m)? (a |esta |essa )?conversa|salva(r|m)? (a |esta |essa )?conversa|meus dados|armazena(r|m)? dados)\b/;

const CONTACT_REGEX =
  /\b(contato|whatsapp|wpp|zap|telefone|celular|email|e mail|linkedin|github|git hub|falar com (ele|o yure|yure)|falo com (ele|o yure|yure)|como (posso )?(entrar em )?contato|como falo com|contratar|orcamento|freelance|reuniao)\b/;

const STACK_REGEX =
  /\b(stack|tecnologia|tecnologias|linguagem|linguagens|framework|frameworks|ferramentas que (ele )?usa|quais ferramentas)\b/;

const ABOUT_STRICT_REGEX =
  /^(quem e (o )?yure|sobre (o )?yure|o que (o )?yure faz|me fale sobre (o )?yure|fale sobre (o )?yure|resumo (do )?yure)\b/;

const ABOUT_RELAXED_REGEX = /\b(quem e (o )?yure|sobre (o )?yure|o que (o )?yure faz)\b/;

const GREETING_REGEX =
  /^(oi|ola|opa|e ai|eai|hey|hello|hi|bom dia|boa tarde|boa noite|tudo bem|tudo bom|como vai|quem e voce|o que voce faz|voce e um robo|voce e uma ia)(\s+(tudo bem|tudo bom|assistente|ai|pessoal))?$/;

export function matchAssistantFaq(text, { relaxed = false } = {}) {
  const normalized = normalizeQuestion(text);
  if (!normalized) return null;

  if (!relaxed && normalized.length > MAX_FAQ_LENGTH) {
    return null;
  }

  if (PRIVACY_REGEX.test(normalized)) {
    return { category: 'privacy', answer: PRIVACY_ANSWER };
  }

  if (CONTACT_REGEX.test(normalized)) {
    return { category: 'contact', answer: CONTACT_ANSWER };
  }

  if (STACK_REGEX.test(normalized) && (relaxed || !/\bprojeto\b/.test(normalized))) {
    return { category: 'stack', answer: STACK_ANSWER };
  }

  if ((relaxed ? ABOUT_RELAXED_REGEX : ABOUT_STRICT_REGEX).test(normalized)) {
    return { category: 'about', answer: ABOUT_ANSWER };
  }

  if ((relaxed || normalized.length <= 45) && GREETING_REGEX.test(normalized)) {
    return { category: 'greeting', answer: GREETING_ANSWER };
  }

  return null;
}

export function buildOfflineFallback(text) {
  const faqMatch = matchAssistantFaq(text, { relaxed: true });
  if (faqMatch) {
    return `${faqMatch.answer}\n\n(Nota: o motor de IA está temporariamente instável, mas esta informação oficial pode te ajudar agora.)`;
  }

  return [
    'O motor de IA está temporariamente indisponível agora, mas você pode falar direto com o Yure pelos canais oficiais:',
    `• WhatsApp: ${ASSISTANT_CONTACT_CHANNELS.whatsappDisplay} (${ASSISTANT_CONTACT_CHANNELS.whatsappUrl})`,
    `• E-mail: ${ASSISTANT_CONTACT_CHANNELS.email}`,
    `• LinkedIn: ${ASSISTANT_CONTACT_CHANNELS.linkedinUrl}`,
    `• GitHub: ${ASSISTANT_CONTACT_CHANNELS.githubUrl}`,
    '',
    'Você também pode tentar novamente em alguns instantes ou usar "Deixar contato pro Yure" logo abaixo.',
  ].join('\n');
}
