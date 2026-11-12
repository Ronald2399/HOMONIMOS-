# Cliente mobile Homônimos

A API do Homônimos é compartilhada por web, Android e iOS. O arquivo `src/api.ts` contém um cliente TypeScript agnóstico de plataforma para ser usado em Expo/React Native.

## API de produção

O cliente usa por padrão a API publicada no Render:

```text
https://homonimo-prod.onrender.com
```

Para desenvolvimento local, substitua a URL com `EXPO_PUBLIC_API_URL`. Em um celular físico, use o IP local do computador, não `localhost`.

## Fluxo recomendado

1. Criar o cliente com a URL HTTPS da API.
2. Após `register` ou `login`, usar `persistApiSession()`; ele armazena o token em `expo-secure-store` (Keychain no iOS e Keystore no Android).
3. Reidratar o token ao abrir o aplicativo com `createAuthenticatedApi()` e chamar `me()`.
4. Nunca armazenar CPF, selfie, documento ou processo em AsyncStorage, logs ou analytics.
5. Usar `report()` e `block()` em toda tela de perfil, post ou conversa.

Exemplo:

```ts
import { HomonimosApi } from "./src/api";
import { createAuthenticatedApi, persistApiSession } from "./src/auth";

const api = new HomonimosApi("https://api.seu-dominio.com");
const user = await api.login(email, senha);
await persistApiSession(api);
const results = await api.search("Ronaldo");
```

A camada mobile ainda precisa receber a identidade visual em Expo e os fluxos nativos de verificação de identidade. Esta separação permite desenvolver Android e iOS sem duplicar regras de negócio.

Antes de abrir o aplicativo, confirme a produção em:

```text
https://homonimo-prod.onrender.com/api/health
```

A resposta esperada contém `"database":"postgresql"`.
