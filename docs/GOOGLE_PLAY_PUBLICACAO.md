# Homônimos — preparação para Google Play

Documento de preparação para a primeira publicação do aplicativo Android `br.com.homonimos.app`.

## Estado técnico desta etapa

- Backend HTTPS no Render e PostgreSQL de produção no Neon.
- Senhas armazenadas com `scrypt` e salt individual; nunca em texto puro.
- Sessões com token aleatório, cookie `httpOnly` e armazenamento seguro no Android/iOS.
- CORS restrito por origem configurável em `CORS_ORIGIN`.
- Cabeçalhos `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e HSTS em produção.
- Limite de tentativas de login e cadastro por IP e rota.
- Alteração de senha protegida pela senha atual.
- Exclusão dentro do app protegida por senha e confirmação `EXCLUIR`.
- Recurso web de exclusão em `/exclusao-de-conta.html`.
- Política de privacidade pública em `/politica-de-privacidade.html`.

## Ficha sugerida

**Nome do app:** Homônimos

**Descrição curta:** Encontre pessoas com o mesmo nome e participe de comunidades seguras.

**Descrição completa:**

> O Homônimos ajuda você a encontrar pessoas que compartilham o seu nome e a participar de comunidades baseadas em identidade, cidade e interesses.
>
> Crie seu perfil, descubra comunidades, publique mensagens, converse por comentários e responda a outras pessoas. Você controla sua presença: pode editar seus dados, ajustar notificações, bloquear perfis, denunciar conteúdo e excluir sua conta.
>
> O aplicativo foi criado para conexões respeitosas. Não exibimos CPF, documentos, processos ou informações sensíveis de terceiros. Use o Homônimos com responsabilidade e compartilhe somente o que fizer sentido para você.

**Categoria sugerida:** Social.

**Anúncios:** Não há SDK de anúncios no aplicativo atual. Declarar “não contém anúncios” somente se isso continuar verdadeiro na versão enviada.

**Público-alvo inicial:** Adultos. O app não é direcionado a crianças e não deve ser descrito como um produto infantil.

## Segurança dos dados — rascunho para conferência

As respostas finais devem refletir exatamente a versão enviada e todos os provedores usados. Este rascunho não substitui a revisão no Play Console.

- **Coleta:** Sim, para recursos de conta e comunidade.
- **Dados tratados:** nome, e-mail, cidade opcional, profissão opcional, biografia opcional, publicações, comentários, denúncias, bloqueios, participação em comunidades e preferências de notificações.
- **Finalidade:** funcionalidade do app, gerenciamento de conta, comunicação entre usuários e segurança/moderação.
- **Compartilhamento:** não vendemos dados; o processamento técnico ocorre na hospedagem da API e no banco de produção necessários para operar o serviço.
- **Criptografia em trânsito:** sim, produção usa HTTPS.
- **Exclusão:** sim, no app e por recurso web público.
- **Senha:** armazenada como hash com `scrypt`; não selecionar senha como dado legível na ficha pública.
- **Identificadores:** revisar no Play Console se o formulário pedir identificadores associados à conta ou ao dispositivo.

## Conteúdo do app no Play Console

Antes de enviar para revisão:

1. Criar o app usando o pacote `br.com.homonimos.app`.
2. Adicionar a Política de Privacidade com o endereço público real: `https://homonimo-prod.onrender.com/politica-de-privacidade.html`.
3. Informar o recurso de exclusão: `https://homonimo-prod.onrender.com/exclusao-de-conta.html`.
4. Preencher Segurança dos dados conforme a versão final e os serviços realmente usados.
5. Declarar que não há anúncios, se nada mudar.
6. Preencher Público-alvo e conteúdo.
7. Solicitar a classificação indicativa.
8. Em Acesso de apps, fornecer uma conta de teste que não contenha dados pessoais reais, se o revisor precisar entrar em áreas protegidas.
9. Adicionar capturas de tela reais do aplicativo, sem CPF, e-mail, senha ou dados de terceiros.
10. Enviar um Android App Bundle de produção (`.aab`), não o APK de preview.

## Pendências antes do envio

- Confirmar que as duas URLs públicas respondem no Render depois do próximo deploy.
- Definir um canal público de suporte e substituir a referência genérica da política por esse contato.
- Criar ícone e imagens finais da ficha, caso ainda não estejam disponíveis.
- Criar uma conta de revisão sem dados reais.
- Gerar o `.aab` de produção quando o limite de builds for renovado em dezembro.
- Fazer uma rodada final com cadastro, login, busca, comunidade, publicação, comentário, denúncia, bloqueio, alteração de senha, exclusão e notificações.

## Fontes oficiais consultadas

- Google Play — [requisitos de exclusão de conta](https://support.google.com/googleplay/android-developer/answer/13327111?hl=pt-BR)
- Google Play — [Segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469?hl=pt-BR)
- Google Play — [preparar app para revisão](https://support.google.com/googleplay/android-developer/answer/9859455?hl=pt-BR)
