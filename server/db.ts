import Database from "better-sqlite3";
import pg from "pg";
import path from "node:path";
import { mkdirSync } from "node:fs";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
export const databaseKind = connectionString ? "postgresql" : "sqlite";
const pool = connectionString ? new Pool({ connectionString, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined, max: 10 }) : null;
const sqlite = connectionString ? null : (() => {
  const dataDir = path.resolve(import.meta.dirname, "../data");
  mkdirSync(dataDir, { recursive: true });
  const database = new Database(path.join(dataDir, "homonimos.sqlite"));
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  return database;
})();

if (sqlite) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, city TEXT, profession TEXT, bio TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS communities (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, member_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS memberships (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, community_id));
    CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, target_type TEXT NOT NULL CHECK(target_type IN ('user', 'post')), target_id INTEGER NOT NULL, reason TEXT NOT NULL, details TEXT, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS blocks (blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (blocker_id, blocked_id), CHECK (blocker_id != blocked_id));
  `);
}

function toPostgresPlaceholders(sql: string) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export async function initDatabase() {
  if (pool) {
    await pool.query("SELECT 1");
    await pool.query("INSERT INTO communities (slug, display_name, member_count) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9) ON CONFLICT (slug) DO NOTHING", ["ronaldo", "Ronaldo", 0, "silva", "Silva", 0, "joao", "João", 0]);
  } else {
    const seedCommunity = sqlite!.prepare("INSERT INTO communities (slug, display_name, member_count) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING");
    seedCommunity.run("ronaldo", "Ronaldo", 4284);
    seedCommunity.run("silva", "Silva", 12950);
    seedCommunity.run("joao", "João", 9850);
  }
}

export async function queryOne<T>(sql: string, params: unknown[] = []) {
  if (pool) {
    const result = await pool.query<T>(toPostgresPlaceholders(sql), params);
    return result.rows[0] as T | undefined;
  }
  return sqlite!.prepare(sql).get(...params) as T | undefined;
}

export async function queryMany<T>(sql: string, params: unknown[] = []) {
  if (pool) {
    const result = await pool.query<T>(toPostgresPlaceholders(sql), params);
    return result.rows;
  }
  return sqlite!.prepare(sql).all(...params) as T[];
}

export async function execute(sql: string, params: unknown[] = []) {
  if (pool) {
    const result = await pool.query(toPostgresPlaceholders(sql), params);
    return { changes: result.rowCount ?? 0, lastInsertRowid: undefined };
  }
  const result = sqlite!.prepare(sql).run(...params);
  return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
}

export type UserRow = {
  id: number;
  name: string;
  email: string;
  city: string | null;
  profession: string | null;
  bio: string | null;
  created_at: string;
};

export function publicUser(user: UserRow) {
  return { id: user.id, name: user.name, city: user.city, profession: user.profession, bio: user.bio, createdAt: user.created_at };
}

export async function getUserById(id: number) {
  return queryOne<UserRow>("SELECT id, name, email, city, profession, bio, created_at FROM users WHERE id = ?", [id]);
}

export async function getUserByEmail(email: string) {
  return queryOne<UserRow & { password_hash: string }>("SELECT id, name, email, password_hash, city, profession, bio, created_at FROM users WHERE email = ?", [email]);
}
