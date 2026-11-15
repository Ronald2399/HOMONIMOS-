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

export type Comment = {
  id: number;
  body: string;
  createdAt: string;
  parentId: number | null;
  author: Pick<User, "id" | "name" | "profession">;
};

export const PRODUCTION_API_URL = "https://homonimo-prod.onrender.com";
export const API_URL = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;

export class HomonimosApi {
  private readonly baseUrl: string;
  private sessionToken: string | null;

  constructor(baseUrl: string, sessionToken?: string | null) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
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

  async updateProfile(input: { name: string; city: string; profession: string; bio: string }) {
    const result = await this.request<{ user: User }>("/api/auth/me", { method: "PATCH", body: JSON.stringify(input) });
    return result.user;
  }

  async logout() {
    await this.request<void>("/api/auth/logout", { method: "POST" });
    this.sessionToken = null;
  }

  async search(name: string) {
    return this.request<{ users: User[] }>(`/api/search?q=${encodeURIComponent(name)}`);
  }

  async listCommunities() {
    return this.request<{ communities: Community[] }>("/api/communities");
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

  async updatePost(postId: number, body: string) {
    return this.request<{ id: number; body: string }>(`/api/posts/${postId}`, { method: "PATCH", body: JSON.stringify({ body }) });
  }

  async deletePost(postId: number) {
    return this.request<void>(`/api/posts/${postId}`, { method: "DELETE" });
  }

  async listComments(postId: number) {
    return this.request<{ comments: Comment[] }>(`/api/posts/${postId}/comments`);
  }

  async createComment(postId: number, body: string, parentId?: number | null) {
    return this.request<{ comment: Comment }>(`/api/posts/${postId}/comments`, { method: "POST", body: JSON.stringify({ body, parentId: parentId || undefined }) });
  }

  async report(targetType: "user" | "post", targetId: number, reason: string, details?: string) {
    return this.request<{ reported: boolean }>("/api/reports", { method: "POST", body: JSON.stringify({ targetType, targetId, reason, details }) });
  }

  async block(userId: number) {
    return this.request<{ blocked: boolean }>("/api/blocks", { method: "POST", body: JSON.stringify({ userId }) });
  }

  async listBlocked() {
    return this.request<{ users: User[] }>("/api/blocks");
  }

  async unblock(userId: number) {
    return this.request<void>(`/api/blocks/${userId}`, { method: "DELETE" });
  }
}
