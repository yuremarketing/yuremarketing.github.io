# Mapa de Dados Pessoais — Épico 2 (Assistente de IA)

Mitigação do risco **R01** (`matriz-riscos.md`). Cobre apenas os dados do Épico 2 (cadastro + chat); o Épico 3 (área privada) terá seu próprio mapa quando for detalhado.

## Dados coletados

| Dado | Origem | Finalidade | Base legal | Retenção |
| :--- | :--- | :--- | :--- | :--- |
| Nome | Formulário de cadastro ou LinkedIn OAuth | Identificar o visitante na conversa e em um eventual contato de retorno | Consentimento explícito (LGPD art. 7º, I) | Enquanto a sessão de chat estiver ativa; se não houver contato, descartado |
| E-mail | Formulário de cadastro ou LinkedIn OAuth | Permitir que o Yure responda ao visitante fora do chat | Consentimento explícito | Só enquanto necessário para o contato; não entra em newsletter ou lista de marketing sem consentimento separado |
| Foto de perfil (quando login via LinkedIn OAuth) | LinkedIn OAuth | Exibição da identidade do visitante na UI do chat | Consentimento explícito (implícito ao optar pelo login social) | Mesma retenção do nome/e-mail |
| Prompts e respostas do chat | Interação do visitante com a LLM | Responder sobre o Yure e seus projetos | Consentimento explícito | **Não persistido no Supabase por padrão** — vive em memória do navegador (estado da sessão), descartado ao fechar/recarregar a aba |
| Metadados técnicos (timestamp, idioma do navegador) | Requisição HTTP | Telemetria mínima de uso do assistente | Legítimo interesse (operação do serviço) | Mesma retenção do log de infraestrutura padrão, não associado a nome/e-mail |

## Fluxo de dados

- Se a LLM usada for via API externa (ex. Anthropic, Google), o **conteúdo do prompt e da resposta sai do servidor do portfólio** e vai para o provedor da LLM. Isso precisa constar explicitamente na política de privacidade (ver `politica-privacidade.md`).
- Os provedores de LLM considerados (Anthropic, Google) **não usam o conteúdo da API para treinar seus modelos por padrão** — isso deve ser confirmado contra os termos vigentes do provedor escolhido antes do Épico 2 entrar em desenvolvimento, e citado na política.
- Nenhum dado de chat é persistido no Supabase por padrão. Se no futuro for necessário persistir (ex. para o visitante retomar a conversa), isso é uma mudança de escopo que exige novo brainstorm de risco, não está coberto por este mapa.

## Direitos do titular (LGPD)

O visitante pode, a qualquer momento:
- Confirmar quais dados foram coletados sobre ele.
- Solicitar eliminação do nome/e-mail retidos para contato.
- Revogar o consentimento, interrompendo a retenção futura (não afeta decisões já tomadas com base no contato anterior).

Canal para exercer esses direitos: a definir na política de privacidade (ex. e-mail de contato do Yure).

## Pendências antes do Épico 2 entrar em desenvolvimento

- [ ] Confirmar qual provedor de LLM será usado e revisar os termos de retenção/treinamento desse provedor especificamente.
- [ ] PO aprovar o texto final de `politica-privacidade.md`.
- [ ] Definir o canal de contato para exercício de direitos LGPD.
