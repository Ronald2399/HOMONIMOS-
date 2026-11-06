# Homônimos — arquitetura da primeira etapa

## Entregue

- API Express com frontend servido pelo mesmo processo.
- SQLite persistente em `data/homonimos.sqlite`.
- Cadastro com nome, e-mail e senha; a senha usa `scrypt` com salt aleatório.
- Sessões de 30 dias em cookie `httpOnly` para web e token Bearer para Android/iOS.
- Busca de usuários sem CPF, processos, documentos ou dados sensíveis.
- Comunidades persistentes e associação de membros.
- Posts persistentes por comunidade.
- Denúncias de usuários/posts.
- Bloqueio de usuários; perfis e posts bloqueados são filtrados na busca/feed.
- CORS controlável por `CORS_ORIGIN`.

## Limites conscientes

O ambiente atual não tem `DATABASE_URL` remoto configurado. Por isso a primeira etapa usa SQLite real e persistente localmente, com uma camada de consultas simples que pode ser migrada para MySQL/TiDB quando a variável for provisionada.

A verificação de identidade com CPF + selfie não foi ativada: ela exige provedor, política de retenção, consentimento LGPD e armazenamento seguro de biometria/documentos. O cadastro inicial deliberadamente não coleta esses dados.

## Rotas principais

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/search?q=...`
- `GET /api/communities/:slug`
- `POST /api/communities/:slug/join`
- `GET|POST /api/communities/:slug/posts`
- `POST /api/reports`
- `POST /api/blocks`
- `DELETE /api/blocks/:userId`
