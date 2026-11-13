# Política de Privacidade — Rascunho (Épico 2)

> **Status: rascunho, pendente de aprovação do PO.** Este texto é a base para a futura página pública `/privacidade`. A publicação em código de produção só acontece depois da aprovação explícita do PO, conforme o risco R01 (`matriz-riscos.md`) e o Gate de Prontidão.

---

## 1. Quem somos

Este portfólio é operado por Yure Mark. Qualquer dúvida sobre esta política ou sobre dados pessoais pode ser enviada para yure.mark@gmail.com.

## 2. Quais dados coletamos e por quê

Quando você usa o assistente de IA deste portfólio, podemos coletar:

- **Nome e e-mail**, informados por você no cadastro ou obtidos via login com LinkedIn — para permitir que o Yure responda ao seu contato fora do chat.
- **Foto de perfil**, se você optar por login via LinkedIn — exibida na interface do chat.
- **O conteúdo da conversa** (perguntas e respostas) — para que o assistente possa responder sobre o Yure e seus projetos.

Detalhes completos em `docs/gestao/mapa-dados-pessoais.md` (uso interno).

## 3. Como usamos seus dados

- O nome e e-mail são usados **apenas** para viabilizar um contato de retorno, se você solicitar. Não são usados para envio de newsletter ou marketing sem seu consentimento separado.
- O conteúdo da conversa é processado por um modelo de linguagem (LLM) para gerar as respostas do assistente. **Isso significa que o texto da sua conversa é enviado a um provedor de IA externo** (Anthropic Claude API / Google Gemini API, sem retenção para treino de modelos), sujeito à política de privacidade do provedor.
- Por padrão, **o histórico da conversa não é salvo nos nossos servidores** — ele existe apenas na memória do seu navegador durante a sessão e é descartado ao fechar ou recarregar a página.

## 4. Consentimento

Antes de iniciar uma conversa com o assistente, você verá uma caixa de consentimento **não marcada por padrão**. Você só poderá conversar com o assistente depois de marcá-la explicitamente, confirmando que leu e concorda com esta política.

## 5. Por quanto tempo guardamos seus dados

- Nome e e-mail: apenas enquanto necessário para viabilizar o contato solicitado. Depois disso, são eliminados.
- Conteúdo da conversa: não é retido pelos nossos servidores (ver seção 3).

## 6. Seus direitos (LGPD)

Você pode, a qualquer momento, solicitar:
- Confirmação sobre quais dados seus temos armazenados.
- Eliminação do seu nome e e-mail.
- Revogação do seu consentimento, interrompendo qualquer retenção futura.

Para exercer esses direitos, contate yure.mark@gmail.com.

## 7. Alterações nesta política

Se esta política for alterada de forma relevante, a data de atualização abaixo será revisada e, se aplicável, o consentimento será solicitado novamente.

**Última atualização:** [preencher na publicação]

---

### Pendências para o PO antes da publicação
- [ ] Definir o provedor de LLM final e preencher o nome na seção 3.
- [ ] Definir o e-mail de contato para exercício de direitos LGPD.
- [ ] Revisar o texto com um advogado, se o PO julgar necessário antes de publicar.
