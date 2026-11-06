import Database from "better-sqlite3";
import path from "node:path";
import { mkdirSync } from "node:fs";

const dataDir = path.resolve(import.meta.dirname, "../data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, "homonimos.sqlite"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    city TEXT,
    profession TEXT,
    bio TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    member_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS memberships (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, community_id)
  );
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK(target_type IN ('user', 'post')),
    target_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS blocks (
    blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
  );
`);

const seedCommunity = db.prepare("INSERT OR IGNORE INTO communities (slug, display_name, member_count) VALUES (?, ?, ?)");
seedCommunity.run("ronaldo", "Ronaldo", 4284);
seedCommunity.run("silva", "Silva", 12950);
seedCommunity.run("joao", "João", 9850);

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

export function getUserById(id: number) {
  return db.prepare("SELECT id, name, email, city, profession, bio, created_at FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function getUserByEmail(email: string) {
  return db.prepare("SELECT id, name, email, password_hash, city, profession, bio, created_at FROM users WHERE email = ?").get(email) as (UserRow & { password_hash: string }) | undefined;
}
