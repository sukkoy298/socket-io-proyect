import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PALETTE = [
  "#ffb454",
  "#8fb7ff",
  "#ff8fa3",
  "#57d38c",
  "#c792ff",
  "#7fdbe8",
  "#f78fc1",
  "#e8d44d",
];

const db = new DatabaseSync(join(dirname(fileURLToPath(import.meta.url)), "chat.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    color TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'texto',
    content TEXT NOT NULL,
    time TEXT NOT NULL
  )
`);

export type StoredMessage = {
  id: string;
  user: string;
  color: string;
  type: "texto" | "sticker";
  content: string;
  time: string;
};

export function saveMessage(message: StoredMessage) {
  db.prepare(
    "INSERT OR REPLACE INTO messages (id, user, color, type, content, time) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(
    message.id,
    message.user,
    message.color,
    message.type,
    message.content,
    message.time,
  );
}

export function getRecentMessages(limit = 50): StoredMessage[] {
  return db
    .prepare(
      "SELECT id, user, color, type, content, time FROM messages ORDER BY rowid DESC LIMIT ?",
    )
    .all(limit)
    .reverse() as StoredMessage[];
}

const inUse = () =>
  db
    .prepare("SELECT color FROM users")
    .all()
    .map((row) => row.color);

export function getOrCreateUser(rawName: string): { name: string; color: string } {
  const name = String(rawName ?? "").trim().slice(0, 20) || "Anónimo";
  const existing = db
    .prepare("SELECT name, color FROM users WHERE name = ?")
    .get(name) as { name: string; color: string } | undefined;

  if (existing) {
    return { name: existing.name, color: existing.color };
  }

  const taken = new Set(inUse());
  const color = PALETTE.find((c) => !taken.has(c)) ?? PALETTE[Math.floor(Math.random() * PALETTE.length)];
  db.prepare("INSERT INTO users (name, color) VALUES (?, ?)").run(name, color);
  return { name, color };
}
