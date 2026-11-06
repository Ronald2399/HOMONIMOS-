import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import cookieParser from "cookie-parser";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { db, getUserByEmail, getUserById, publicUser, type UserRow } from "./db";

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

function createSession(userId: number) {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expiresAt);
  return { token, expiresAt };
}

function setSessionCookie(res: Response, token: string, expiresAt: string) {
  res.cookie(sessionCookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    expires: new Date(expiresAt),
    path: "/",
  });
}

function clearSessionCookie(res: Response) {
  res.clearCookie(sessionCookie, { httpOnly: true, sameSite: "lax", secure: isProduction, path: "/" });
}

function resolveUser(req: Request) {
  const bearer = req.header("authorization");
  const token = req.cookies?.[sessionCookie] || (bearer?.startsWith("Bearer ") ? bearer.slice(7) : undefined);
  if (!token) return undefined;
  const session = db.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?").get(token) as { user_id: number; expires_at: string } | undefined;
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    if (session) db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
    return undefined;
  }
  return getUserById(session.user_id);
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const user = resolveUser(req);
  if (!user) return res.status(401).json({ error: "AUTH_REQUIRED", message: "Entre na sua conta para continuar." });
  req.user = user;
  next();
}

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128),
  city: z.string().trim().max(90).optional(),
  profession: z.string().trim().max(90).optional(),
}).strict();
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(128) }).strict();
const postSchema = z.object({ body: z.string().trim().min(1).max(1000) }).strict();
const reportSchema = z.object({ targetType: z.enum(["user", "post"]), targetId: z.number().int().positive(), reason: z.string().trim().min(3).max(120), details: z.string().trim().max(500).optional() }).strict();
const blockSchema = z.object({ userId: z.number().int().positive() }).strict();

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "homonimos-api", database: "sqlite" }));

app.post("/api/auth/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "Confira nome, e-mail e senha. Somente dados básicos são solicitados." });
  const data = parsed.data;
  const email = data.email.toLowerCase();
  if (getUserByEmail(email)) return res.status(409).json({ error: "EMAIL_IN_USE", message: "Este e-mail já possui uma conta." });
  const result = db.prepare("INSERT INTO users (name, email, password_hash, city, profession) VALUES (?, ?, ?, ?, ?)").run(data.name, email, hashPassword(data.password), data.city || null, data.profession || null);
  const user = getUserById(Number(result.lastInsertRowid))!;
  const session = createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  return res.status(201).json({ user: publicUser(user), sessionToken: session.token });
});

app.post("/api/auth/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "Informe um e-mail válido e sua senha." });
  const user = getUserByEmail(parsed.data.email.toLowerCase());
  if (!user || !verifyPassword(parsed.data.password, user.password_hash)) return res.status(401).json({ error: "INVALID_CREDENTIALS", message: "E-mail ou senha inválidos." });
  const session = createSession(user.id);
  setSessionCookie(res, session.token, session.expiresAt);
  return res.json({ user: publicUser(user), sessionToken: session.token });
});

app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies?.[sessionCookie];
  if (token) db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
  clearSessionCookie(res);
  return res.status(204).send();
});

app.get("/api/auth/me", (req, res) => {
  const user = resolveUser(req);
  return res.json({ user: user ? publicUser(user) : null });
});

app.get("/api/search", (req, res) => {
  const query = String(req.query.q || "").trim();
  if (query.length < 2) return res.json({ users: [] });
  const currentUser = resolveUser(req);
  const rows = db.prepare(`
    SELECT u.id, u.name, u.city, u.profession, u.bio, u.created_at
    FROM users u
    WHERE (LOWER(u.name) LIKE LOWER(?) OR LOWER(COALESCE(u.city, '')) LIKE LOWER(?) OR LOWER(COALESCE(u.profession, '')) LIKE LOWER(?))
      ${currentUser ? "AND u.id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)" : ""}
    ORDER BY u.name ASC LIMIT 30
  `).all(`%${query}%`, `%${query}%`, `%${query}%`, ...(currentUser ? [currentUser.id] : [])) as UserRow[];
  return res.json({ users: rows.map(publicUser) });
});

app.get("/api/communities/:slug", (req, res) => {
  const community = db.prepare("SELECT id, slug, display_name, member_count, created_at FROM communities WHERE slug = ?").get(req.params.slug) as { id: number; slug: string; display_name: string; member_count: number; created_at: string } | undefined;
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const user = resolveUser(req);
  const membership = user ? db.prepare("SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?").get(user.id, community.id) : undefined;
  return res.json({ community: { id: community.id, slug: community.slug, name: community.display_name, memberCount: community.member_count, joined: Boolean(membership) } });
});

app.post("/api/communities/:slug/join", requireAuth, (req: AuthRequest, res) => {
  const community = db.prepare("SELECT id FROM communities WHERE slug = ?").get(req.params.slug) as { id: number } | undefined;
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const insert = db.prepare("INSERT OR IGNORE INTO memberships (user_id, community_id) VALUES (?, ?)").run(req.user!.id, community.id);
  if (insert.changes) db.prepare("UPDATE communities SET member_count = member_count + 1 WHERE id = ?").run(community.id);
  return res.json({ joined: true });
});

app.get("/api/communities/:slug/posts", (req, res) => {
  const community = db.prepare("SELECT id FROM communities WHERE slug = ?").get(req.params.slug) as { id: number } | undefined;
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const user = resolveUser(req);
  const rows = db.prepare(`
    SELECT p.id, p.body, p.created_at, u.id AS user_id, u.name, u.city, u.profession
    FROM posts p JOIN users u ON u.id = p.user_id
    WHERE p.community_id = ? ${user ? "AND p.user_id NOT IN (SELECT blocked_id FROM blocks WHERE blocker_id = ?)" : ""}
    ORDER BY p.created_at DESC LIMIT 50
  `).all(community.id, ...(user ? [user.id] : [])) as Array<{ id: number; body: string; created_at: string; user_id: number; name: string; city: string | null; profession: string | null }>;
  return res.json({ posts: rows.map((post) => ({ id: post.id, body: post.body, createdAt: post.created_at, author: { id: post.user_id, name: post.name, city: post.city, profession: post.profession } })) });
});

app.post("/api/communities/:slug/posts", requireAuth, (req: AuthRequest, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "A publicação deve ter entre 1 e 1000 caracteres." });
  const community = db.prepare("SELECT id FROM communities WHERE slug = ?").get(req.params.slug) as { id: number } | undefined;
  if (!community) return res.status(404).json({ error: "NOT_FOUND", message: "Comunidade não encontrada." });
  const membership = db.prepare("SELECT 1 FROM memberships WHERE user_id = ? AND community_id = ?").get(req.user!.id, community.id);
  if (!membership) return res.status(403).json({ error: "JOIN_REQUIRED", message: "Entre na comunidade antes de publicar." });
  const result = db.prepare("INSERT INTO posts (user_id, community_id, body) VALUES (?, ?, ?)").run(req.user!.id, community.id, parsed.data.body);
  return res.status(201).json({ id: Number(result.lastInsertRowid), body: parsed.data.body });
});

app.post("/api/reports", requireAuth, (req: AuthRequest, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "INVALID_INPUT", message: "Informe o conteúdo e o motivo da denúncia." });
  const data = parsed.data;
  db.prepare("INSERT INTO reports (reporter_id, target_type, target_id, reason, details) VALUES (?, ?, ?, ?, ?)").run(req.user!.id, data.targetType, data.targetId, data.reason, data.details || null);
  return res.status(201).json({ reported: true, message: "Denúncia registrada. Nossa equipe analisará o caso." });
});

app.post("/api/blocks", requireAuth, (req: AuthRequest, res) => {
  const parsed = blockSchema.safeParse(req.body);
  if (!parsed.success || parsed.data.userId === req.user!.id) return res.status(400).json({ error: "INVALID_INPUT", message: "Não foi possível bloquear este perfil." });
  const target = getUserById(parsed.data.userId);
  if (!target) return res.status(404).json({ error: "NOT_FOUND", message: "Perfil não encontrado." });
  db.prepare("INSERT OR IGNORE INTO blocks (blocker_id, blocked_id) VALUES (?, ?)").run(req.user!.id, target.id);
  return res.json({ blocked: true });
});

app.delete("/api/blocks/:userId", requireAuth, (req: AuthRequest, res) => {
  db.prepare("DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?").run(req.user!.id, Number(req.params.userId));
  return res.status(204).send();
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  return res.status(500).json({ error: "INTERNAL_ERROR", message: "Não foi possível concluir a operação." });
});

async function start() {
  if (!isProduction) {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa", configFile: path.resolve(__dirname, "../vite.config.ts") });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "../dist")));
    app.get("*", (_req, res) => res.sendFile(path.resolve(__dirname, "../dist/index.html")));
  }
  app.listen(port, "0.0.0.0", () => console.log(`Homônimos API running on http://localhost:${port}`));
}

start().catch((error) => { console.error(error); process.exit(1); });
