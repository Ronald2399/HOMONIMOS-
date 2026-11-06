import { HomonimosApi } from "./api";
import { clearSessionToken, loadSessionToken, saveSessionToken } from "./session";

export async function createAuthenticatedApi(baseUrl: string) {
  const token = await loadSessionToken();
  const api = new HomonimosApi(baseUrl, token);
  return { api, token };
}

export async function persistApiSession(api: HomonimosApi) {
  const token = api.getSessionToken();
  if (token) await saveSessionToken(token);
}

export async function signOut(api: HomonimosApi) {
  try {
    await api.logout();
  } finally {
    await clearSessionToken();
  }
}
