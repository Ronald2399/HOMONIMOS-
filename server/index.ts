import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { databaseKind, execute, getUserByEmail, getUserById, initDatabase, publicUser, queryMany, queryOne, type UserRow } from "./db";

const app = express();
const port = Number(process.env.PORT || 3001);
const isProduction = process.env.NODE_ENV === "production";
const sessionCookie = "hm_session";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || "*";
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

type AuthRequest = Request & { user?: UserRow };
type SessionRow = { user_id: number; expires_at: string };

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) return false;
  const calculated = scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHash, "hex");
  return expected.length === calculated.length && timingSafeEqual(expected, calculated);
}

async function createSession(userId: number) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await execute("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)", [token, userId, expiresAt]);
  return { token, expiresAt };
}

function setSessionCookie(res: Response, token: string, expiresAt: string) {
  res.cookie(sessionCookie, token, { httpOnly: true, sameSite: "lax", secure: isProduction, expires: new Date(expiresAt), path: "/" });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(sessionCookie, { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" });
}

async function resolveUser(req: Request) {
  const bearer = req.header("authorization");
  const token = req.cookies?.[sessionCookie] || (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);
  if (!token) return undefined;
  const session = await queryOne<SessionRow>("SELECT user_id, expires_at FROM sessions WHERE id = ?", [token]);
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    if (session) await execute("DELETE FROM sessions WHERE id = ?", [token]);
    return undefined;
  }
  return getUserById(session.user_id);
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = await resolveUser(req);
  if (!user) return res.status(401).json({ error: "AUTH_REQUIRED", message: "Entre na sua conta para continuar." });
  req.user = user;
  next();
}

const registerSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), password: z.string().min(8).max(128), city: z.string().trim().max(90).optional(), profession: z.string().trim().max(90).optional() }).strict();
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) }).strict();
const postSchema = z.object({ body: z.string().trim().min(1).max(1000) }).strict();
const reportSchema = z.object({ targetType: z.enum(["user", "post"]), targetId: z.number().int().positive(), reason: z.string().trim().min(3).max(120), details: z.string().trim().max(500).optional() }).strict();
const blockSchema = z.object({ userId: z.number().int().positive() }).strict();

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "homonimos-api", database: databaseKind }));

app.post("/api/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "Confira nome, e-mail e senha. Somente dados básicos são solicitados." });
  const data = parsed.data;
  const email = data.email.toLowerCase();
  if (await getUserByEmail(email)) return res.status(409).json({ error: "EMAIL_IN_USE", message: "Este e-mail já possui uma conta." });
  const inserted = await queryOne<{ id: number }>("INSERT INTO users (name, email, password_hash, city, profession) VALUES (?, ?, ?, ?, ?) RETURNING id", [data.name, email, hashPassword(data.password), data.city || null, data.profession || null]);
  const user = inserted ? await getUserById(Number(inserted.id)) : undefined;
  if (!user) return res.status(500).json({ error: "USER_CREATE_FAILED", message: "Não foi possível criar sua conta." });
  const session = await createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  return res.status(201).json({ user: publicUser(user), sessionToken: session.token });
});

app.post("/api/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "Informe um e-mail válido e sua senha." });
  const user = await getUserByEmail(parsed.data.email.toLowerCase());
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "E-mail ou senha inválidos." });
  const session = await createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  return res.json({ user: publicUser(user), sessionToken: session.token });
});

app.post("/api/auth/logout", async (req, res) => {
  const token = req.cookies?.[sessionCookie] || (req.header("authorization")?.startsWith("Bearer ") ? req.header("authorization")!.slice(7) : undefined);
  if (token) await execute("DELETE FROM sessions WHERE id = ?", [token]);
  clearSessionCookie(res);
  return res.status(204).send();
});

app.get("/api/auth/me", async (req, res) => {
  const user = await resolveUser(req);
  return res.json({ user: user ? publicUser(user) : null });
});

app.get("/api/search", async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2) return res.json({ users: [] });
  const currentUser = await resolveUser(req);
  const params: unknown[] = [`%${query}%`, `%${query}%`, `%${query}%`];
  const blockedFilter = currentUser ? "AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)" : "";
  if (currentUser) params.push(currentUser.id);
  const rows = await queryMany<UserRow>(`SELECT u.id, u.name, u.city, u.profession, u.bio, u.created_at FROM users u WHERE (LOWER(u.name) LIKE LOWER(?) OR LOWER(COALESCE(u.city, '')) LIKE LOWER(?) OR LOWER(COALESCE(u.profession, '')) LIKE LOWER(?)) ${blockedFilter} ORDER BY u.name ASC LIMIT 30`, params);
  return res.json({ users: rows.map(publicUser) });
});

app.get("/api/communities/:slug", async (req, res) => {
  const community = await queryOne<{ id: number; slug: string; display_name: string; member_count: number; created_at: string }>("SELECT id, slug, display_name, member_count, created_at FROM communities WHERE slug = ?", [req.params.slug]);
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const user = await resolveUser(req);
  const membership = user ? await queryOne("SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?", [user.id, community.id]) : undefined;
  return res.json({ community: { id: community.id, slug: community.slug, name: community.display_name, memberCount: community.member_count, joined: Boolean(membership) } });
});

app.post("/api/communities/:slug/join", requireAuth, async (req: AuthRequest, res) => {
  const community = await queryOne<{ id: number }>("SELECT id FROM communities WHERE slug = ?", [req.params.slug]);
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const insert = await execute("INSERT INTO memberships (user_id, community_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [req.user!.id, community.id]);
  if (insert.changes) await execute("UPDATE communities SET member_count = member_count + 1 WHERE id = ?", [community.id]);
  return res.json({ joined: true });
});

app.get("/api/communities/:slug/posts", async (req, res) => {
  const community = await queryOne<{ id: number }>("SELECT id FROM communities WHERE slug = ?", [req.params.slug]);
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const user = await resolveUser(req);
  const params: unknown[] = [community.id];
  const blockedFilter = user ? "AND p.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)" : "";
  if (user) params.push(user.id);
  const rows = await queryMany<{ id: number; body: string; created_at: string; user_id: number; name: string; city: string | null; profession: string | null }>(`SELECT p.id, p.body, p.created_at, u.id AS user_id, u.name, u.city, u.profession FROM posts p JOIN users u ON u.id = p.user_id WHERE p.community_id = ? ${blockedFilter} ORDER BY p.created_at DESC LIMIT 50`, params);
  return res.json({ posts: rows.map((post) => ({ id: post.id, body: post.body, createdAt: post.created_at, author: { id: post.user_id, name: post.name, city: post.city, profession: post.profession } })) });
});

app.post("/api/communities/:slug/posts", requireAuth, async (req: AuthRequest, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "A publicação deve ter entre 1 e 1000 caracteres." });
  const community = await queryOne<{ id: number }>("SELECT id FROM communities WHERE slug = ?", [req.params.slug]);
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const membership = await queryOne("SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?", [req.user!.id, community.id]);
  if (!membership) return res.status(403).json({ error: "JOIN_REQUIRED", message: "Entre na comunidade antes de publicar." });
  const result = await queryOne<{ id: number }>("INSERT INTO posts (user_id, community_id, body) VALUES (?, ?, ?) RETURNING id", [req.user!.id, community.id, parsed.data.body]);
  return res.status(201).json({ id: result?.id, body: parsed.data.body });
});

app.post("/api/reports", requireAuth, async (req: AuthRequest, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "Informe o conteúdo e o motivo da denúncia." });
  const data = parsed.data;
  await execute("INSERT INTO reports (reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)", [req.user!.id, data.targetType, data.targetId, data.reason, data.details || null]);
  return res.status(201).json({ reported: true, message: "Denúncia registrada. Nossa equipe analisará o caso." });
});

app.post("/api/blocks", requireAuth, async (req: AuthRequest, res) => {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.userId === req.user!.id) return res.status(400).json({ error: "INVALID_INPUT", message: "Não foi possível bloquear este perfil." });
  const target = await getUserById(parsed.data.userId);
  if (!target) return res.status(404).json({ error: "NOT_FOUND", message: "Perfil não encontrado." });
  await execute("INSERT INTO blocks (blocker_id, blocked_id) VALUES (?, ?) ON CONFLICT DO NOTHING", [req.user!.id, target.id]);
  return res.json({ blocked: true });
});

app.delete("/api/blocks/:userId", requireAuth, async (req: AuthRequest, res) => {
  await execute("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?", [req.user!.id, Number(req.params.userId)]);
  return res.status(204).send();
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "Não foi possível concluir a operação." });
});

async function start() {
  await initDatabase();
  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa", configFile: path.resolve(__dirname, "../vite.config.ts") });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "../dist")));
    app.use((_req, res) => res.sendFile(path.resolve(__dirname, "../dist/index.html")));
  }
  app.listen(port, "0.0.0.0", () => console.log(`Homônimos API running on http://localhost:${port} using ${databaseKind}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
