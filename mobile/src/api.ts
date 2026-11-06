export type User = {
  id: number;
  name: string;
  city: string | null;
  profession: string | null;
  bio: string | null;
  createdAt: string;
};

export type Community = {
  id: number;
  slug: string;
  name: string;
  memberCount: number;
  joined: boolean;
};

export type Post = {
  id: number;
  body: string;
  createdAt: string;
  author: Pick<User, "id" | "name" | "city" | "profession">;
};

export class HomonimosApi {
  private readonly baseUrl: string;
  private sessionToken: string | null;

  constructor(baseUrl: string, sessionToken?: string | null) {
    this.baseUrl = baseUrl.replace(/\\/$/, "");
    this.sessionToken = sessionToken ?? null;
  }

  setSessionToken(token: string | null) {
    this.sessionToken = token;
  }

  getSessionToken() {
    return this.sessionToken;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set("Content-Type", "application/json");
    if (this.sessionToken) headers.set("Authorization", `Bearer ${this.sessionToken}`);
    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Não foi possível concluir a operação.");
    return payload as T;
  }

  async register(input: { name: string; email: string; password: string; city?: string; profession?: string }) {
    const result = await this.request<{ user: User; sessionToken: string }>("/api/auth/register", { method: "POST", body: JSON.stringify(input) });
    this.sessionToken = result.sessionToken;
    return result.user;
  }

  async login(email: string, password: string) {
    const result = await this.request<{ user: User; sessionToken: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    this.sessionToken = result.sessionToken;
    return result.user;
  }

  async me() {
    return this.request<{ user: User | null }>("/api/auth/me");
  }

  async search(name: string) {
    return this.request<{ users: User[] }>(`/api/search?q=${encodeURIComponent(name)}`);
  }

  async getCommunity(slug: string) {
    return this.request<{ community: Community }>(`/api/communities/${encodeURIComponent(slug)}`);
  }

  async joinCommunity(slug: string) {
    return this.request<{ joined: boolean }>(`/api/communities/${encodeURIComponent(slug)}/join`, { method: "POST" });
  }

  async listPosts(slug: string) {
    return this.request<{ posts: Post[] }>(`/api/communities/${encodeURIComponent(slug)}/posts`);
  }

  async createPost(slug: string, body: string) {
    return this.request<{ id: number; body: string }>(`/api/communities/${encodeURIComponent(slug)}/posts`, { method: "POST", body: JSON.stringify({ body }) });
  }

  async report(targetType: "user" | "post", targetId: number, reason: string, details?: string) {
    return this.request<{ reported: boolean }>("/api/reports", { method: "POST", body: JSON.stringify({ targetType, targetId, reason, details }) });
  }

  async block(userId: number) {
    return this.request<{ blocked: boolean }>("/api/blocks", { method: "POST", body: JSON.stringify({ userId }) });
  }
}
