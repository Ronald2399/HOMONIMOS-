# Preparação para produção

## Banco remoto

O código local continua usando SQLite para desenvolvimento. A produção deve usar PostgreSQL com uma `DATABASE_URL` armazenada no provedor de deploy, nunca no GitHub, no aplicativo mobile ou em mensagens.

Depois que o banco for provisionado, configure `DATABASE_URL` no ambiente de produção e execute:

```bash
pnpm migrate:postgres
```

A migração é idempotente e cria usuários, sessões, comunidades, associações, posts, denúncias e bloqueios.

## Variáveis necessárias

```text
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=<segredo forte gerado pelo provedor>
CORS_ORIGIN=https://app.seu-dominio.com
```

O valor real de `DATABASE_URL` não deve ser commitado. O banco remoto deve ter backups automáticos, TLS, usuário com privilégios mínimos e um ambiente separado de staging.

## Publicação mobile

O app Expo usa `EXPO_PUBLIC_API_URL` para apontar para a API HTTPS. O token de sessão deve ser persistido com `expo-secure-store`, nunca com AsyncStorage ou em logs.

Antes de enviar para as lojas, ainda é necessário configurar os identificadores finais Apple/Google, ícones, splash screen, política de privacidade, termos de uso, canal de suporte, screenshots e credenciais EAS.
