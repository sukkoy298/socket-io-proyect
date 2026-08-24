import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  ALLOWED_PALETTE,
  DEFAULT_ROOM,
  validateUsernameFormat,
} from "./config.js";

const db = new DatabaseSync(
  join(dirname(fileURLToPath(import.meta.url)), "chat.db"),
);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    color TEXT NOT NULL,
    is_online INTEGER NOT NULL DEFAULT 0
  )
`);

// Safe migration in case the existing DB did not have is_online column
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
  const hasIsOnline = tableInfo.some((col) => col.name === "is_online");
  if (!hasIsOnline) {
    db.exec("ALTER TABLE users ADD COLUMN is_online INTEGER NOT NULL DEFAULT 0");
  }
} catch (e) {
  console.warn("Table migration notice:", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user TEXT NOT NULL,
    color TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'texto',
    content TEXT NOT NULL,
    time TEXT NOT NULL,
    room TEXT NOT NULL DEFAULT '${DEFAULT_ROOM}'
  )
`);

// Safe migration in case the existing DB did not have room column on messages
try {
  const msgTableInfo = db.prepare("PRAGMA table_info(messages)").all() as Array<{ name: string }>;
  const hasRoom = msgTableInfo.some((col) => col.name === "room");
  if (!hasRoom) {
    db.exec(`ALTER TABLE messages ADD COLUMN room TEXT NOT NULL DEFAULT '${DEFAULT_ROOM}'`);
  }
} catch (e) {
  console.warn("Messages migration notice:", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL COLLATE NOCASE UNIQUE,
    created_by TEXT NOT NULL DEFAULT 'sistema',
    created_at TEXT NOT NULL
  )
`);

// Seed the default room if there are no rooms yet
const roomSeed = db.prepare("SELECT COUNT(*) AS n FROM rooms").get() as { n: number };
if (roomSeed.n === 0) {
  db.prepare("INSERT INTO rooms (name, created_by, created_at) VALUES (?, ?, ?)").run(
    DEFAULT_ROOM,
    "sistema",
    new Date().toISOString(),
  );
}

export type StoredMessage = {
  id: string;
  user: string;
  color: string;
  type: "texto" | "sticker";
  content: string;
  time: string; // ISO 8601 UTC string: YYYY-MM-DDTHH:mm:ss.sssZ
  room?: string;
};

export type Room = {
  id: number;
  name: string;
  created_by: string;
  created_at: string;
};

export function saveMessage(message: StoredMessage) {
  db.prepare(
    "INSERT OR REPLACE INTO messages (id, user, color, type, content, time, room) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    message.id,
    message.user,
    message.color,
    message.type,
    message.content,
    message.time,
    message.room ?? DEFAULT_ROOM,
  );
}

export function getRecentMessages(room = DEFAULT_ROOM, limit = 50): StoredMessage[] {
  return db
    .prepare(
      "SELECT id, user, color, type, content, time FROM messages WHERE room = ? ORDER BY rowid DESC LIMIT ?",
    )
    .all(room, limit)
    .reverse() as StoredMessage[];
}

export function listRooms(): Room[] {
  return db
    .prepare("SELECT id, name, created_by, created_at FROM rooms ORDER BY id ASC")
    .all() as Room[];
}

export function roomExists(rawName: string): boolean {
  return !!db.prepare("SELECT id FROM rooms WHERE name = ? COLLATE NOCASE").get(String(rawName).trim());
}

export function createRoom(name: string, createdBy: string): Room {
  db.prepare("INSERT INTO rooms (name, created_by, created_at) VALUES (?, ?, ?)").run(
    name,
    createdBy,
    new Date().toISOString(),
  );
  return db.prepare("SELECT id, name, created_by, created_at FROM rooms WHERE name = ? COLLATE NOCASE").get(name) as Room;
}

export function resetAllUsersOffline() {
  db.prepare("UPDATE users SET is_online = 0").run();
}

export function getOnlineColors(): string[] {
  const rows = db
    .prepare("SELECT DISTINCT color FROM users WHERE is_online = 1")
    .all() as Array<{ color: string }>;
  return rows.map((r) => r.color);
}

export function getAvailableColors(): string[] {
  const onlineColors = new Set(getOnlineColors());
  return ALLOWED_PALETTE.filter((c) => !onlineColors.has(c));
}

export function setUserOnline(name: string, isOnline: boolean) {
  db.prepare("UPDATE users SET is_online = ? WHERE name = ? COLLATE NOCASE").run(
    isOnline ? 1 : 0,
    name,
  );
}

export type RegisterResult =
  | { success: true; user: { name: string; color: string } }
  | { success: false; status: number; error: string };

export function registerOrValidateUser(
  rawName: string,
  requestedColor?: string,
): RegisterResult {
  const validation = validateUsernameFormat(rawName);
  if (!validation.valid) {
    return {
      success: false,
      status: 400,
      error: validation.error ?? "Nombre de usuario inválido.",
    };
  }
  const name = validation.cleanName;

  const existingUser = db
    .prepare("SELECT id, name, color, is_online FROM users WHERE name = ? COLLATE NOCASE")
    .get(name) as { id: number; name: string; color: string; is_online: number } | undefined;

  const onlineColors = new Set(getOnlineColors());

  let selectedColor = requestedColor;

  if (selectedColor) {
    if (!ALLOWED_PALETTE.includes(selectedColor as any)) {
      return {
        success: false,
        status: 400,
        error: "El color seleccionado no pertenece a la paleta permitida.",
      };
    }

    // Check if the requested color is occupied by another online user
    if (onlineColors.has(selectedColor)) {
      // If the current user is already the online user with this color, it's ok, otherwise reject
      if (!existingUser || existingUser.color !== selectedColor || existingUser.is_online !== 1) {
        return {
          success: false,
          status: 400,
          error: "El color seleccionado ya está en uso por un usuario activo en línea.",
        };
      }
    }
  }

  if (existingUser) {
    // User already exists in SQLite
    if (!selectedColor) {
      // If user did not specify a new color, check if their current saved color is free
      if (existingUser.is_online === 1 || !onlineColors.has(existingUser.color)) {
        selectedColor = existingUser.color;
      } else {
        // Color is taken by someone else online, assign the first available color
        const available = ALLOWED_PALETTE.filter((c) => !onlineColors.has(c));
        if (available.length === 0) {
          return {
            success: false,
            status: 400,
            error: "No hay colores libres disponibles en este momento.",
          };
        }
        selectedColor = available[0];
      }
    }

    // Update color and mark is_online in DB
    db.prepare("UPDATE users SET color = ?, is_online = 1 WHERE id = ?").run(
      selectedColor,
      existingUser.id,
    );
    return {
      success: true,
      user: { name: existingUser.name, color: selectedColor },
    };
  }

  // New user registration
  if (!selectedColor) {
    const available = ALLOWED_PALETTE.filter((c) => !onlineColors.has(c));
    if (available.length === 0) {
      return {
        success: false,
        status: 400,
        error: "El chat ha alcanzado el límite de colores activos (8/8). Espera a que un usuario se desconecte.",
      };
    }
    selectedColor = available[0];
  }

  db.prepare("INSERT INTO users (name, color, is_online) VALUES (?, ?, 1)").run(
    name,
    selectedColor as string,
  );

  return {
    success: true,
    user: { name, color: selectedColor },
  };
}
