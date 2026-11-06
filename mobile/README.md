# Cliente mobile Homônimos

A API do Homônimos é compartilhada por web, Android e iOS. O arquivo `src/api.ts` contém um cliente TypeScript agnóstico de plataforma para ser usado em Expo/React Native.

## Fluxo recomendado

1. Criar o cliente com a URL HTTPS da API.
2. Após `register` ou `login`, armazenar `getSessionToken()` em armazenamento seguro (`expo-secure-store` no Expo; Keychain no iOS e Keystore no Android).
3. Reidratar o token ao abrir o aplicativo e chamar `me()`.
4. Nunca armazenar CPF, selfie, documento ou processo em AsyncStorage, logs ou analytics.
5. Usar `report()` e `block()` em toda tela de perfil, post ou conversa.

Exemplo:

```ts
import { HomonimosApi } from "./src/api";

const api = new HomonimosApi("https://api.seu-dominio.com");
const user = await api.login(email, senha);
// Persista api.getSessionToken() usando armazenamento seguro.
const results = await api.search("Ronaldo");
```

A camada mobile ainda precisa receber a identidade visual em Expo e os fluxos nativos de verificação de identidade. Esta separação permite desenvolver Android e iOS sem duplicar regras de negócio.
