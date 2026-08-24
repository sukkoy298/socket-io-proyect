import express from "express";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server, type Socket } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import {
  createRoom,
  getAvailableColors,
  getOnlineColors,
  getRecentMessages,
  listRooms,
  registerOrValidateUser,
  resetAllUsersOffline,
  roomExists,
  saveMessage,
  setUserOnline,
} from "./db.js";
import {
  ALLOWED_PALETTE,
  checkAdminPassword,
  DEFAULT_ROOM,
  validateRoomName,
} from "./config.js";
import { getStickers } from "./giphy.js";

// Clean up previous online session states on server restart
resetAllUsersOffline();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const dist = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "frontend",
  "dist",
);
const indexHtml = join(dist, "index.html");

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// API: Stickers with Giphy
app.get("/api/stickers", async (req, res) => {
  res.set("Cache-Control", "no-store");
  const expression = String(req.query.expression ?? "")
    .trim()
    .slice(0, 30);
  if (!expression) {
    return res.status(400).json({ error: "Falta el parámetro expression" });
  }
  try {
    const stickers = await getStickers(expression);
    res.json({ expression, stickers });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : "No se pudo consultar Giphy",
    });
  }
});

// API: Available colors (FASE 1)
app.get("/api/colors", (_req, res) => {
  res.set("Cache-Control", "no-store");
  const available = getAvailableColors();
  const taken = getOnlineColors();
  res.json({
    available,
    palette: ALLOWED_PALETTE,
    taken,
  });
});

// API: User validation and registration (FASE 1)
app.post("/api/register", (req, res) => {
  const { username, color, password } = req.body ?? {};
  const adminCheck = checkAdminPassword(username, password);
  if (!adminCheck.ok) {
    return res.status(403).json({
      error: adminCheck.error,
      code: "admin_password_required",
    });
  }
  const result = registerOrValidateUser(username, color);
  if (!result.success) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json({
    user: { ...result.user, isAdmin: adminCheck.isAdmin },
    availableColors: getAvailableColors(),
  });
});

if (existsSync(indexHtml)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      req.path.startsWith("/socket.io") ||
      req.path.startsWith("/api")
    ) {
      return next();
    }
    res.sendFile(indexHtml);
  });
}

type SessionUser = {
  name: string;
  color: string;
  isAdmin: boolean;
};

const users = new Map<string, SessionUser & { room: string }>();
const typing = new Map<string, { name: string; color: string }>();

// Generates ISO 8601 UTC timestamp (FASE 2)
const nowISO = () => new Date().toISOString();

const usersInRoom = (room: string) =>
  [...users.entries()]
    .filter(([, u]) => u.room === room)
    .map(([id, u]) => ({ id, ...u }));

const publicUser = ({ name, color, isAdmin }: SessionUser) => ({
  name,
  color,
  isAdmin,
});

const roomsWithCounts = () =>
  listRooms().map((r) => ({
    name: r.name,
    createdBy: r.created_by,
    userCount: usersInRoom(r.name).length,
  }));

const emitUsersUpdate = (rooms: Iterable<string | undefined>) => {
  const unique = new Set(rooms);
  for (const room of unique) {
    if (!room) continue;
    const list = usersInRoom(room).map(({ name, color, isAdmin }) => ({
      name,
      color,
      isAdmin,
    }));
    io.to(room).emit("users:update", { room, users: list, count: list.length });
  }
  // Keep every client's room list/counters fresh
  io.emit("colors:update", {
    available: getAvailableColors(),
    taken: getOnlineColors(),
  });
  io.emit("rooms:update", { rooms: roomsWithCounts() });
};

const broadcastTyping = () => {
  const byRoom = new Map<string, { name: string; color: string }[]>();
  for (const [socketId, t] of typing) {
    const session = users.get(socketId);
    if (!session) continue;
    const list = byRoom.get(session.room) ?? [];
    list.push(t);
    byRoom.set(session.room, list);
  }
  for (const [room, list] of byRoom) {
    io.to(room).emit("users:typing", { users: list });
  }
};

// Removes a user session and announces it in its room
const removeSocketSession = (socketId: string, leaveText?: string) => {
  const user = users.get(socketId);
  if (!user) return;
  users.delete(socketId);
  const hadTyping = typing.delete(socketId);
  setUserOnline(user.name, false);
  io.to(user.room).emit("system", {
    text: leaveText ?? `${user.name} salió del chat`,
    time: nowISO(),
  });
  emitUsersUpdate([user.room]);
  if (hadTyping) broadcastTyping();
};

// Moves a joined user into a room, announcing in both rooms when switching
const joinRoom = (socket: Socket, roomName: string) => {
  const user = users.get(socket.id);
  if (!user) return;
  const previous = socket.data.room as string | undefined;
  if (previous === roomName) return;

  if (previous) {
    socket.leave(previous);
    io.to(previous).emit("system", {
      text: `${user.name} se fue a la sala «${roomName}»`,
      time: nowISO(),
    });
  }

  socket.data.room = roomName;
  user.room = roomName;
  socket.join(roomName);

  io.to(roomName).emit("system", {
    text: previous ? `${user.name} entró a la sala` : `${user.name} se unió al chat`,
    time: nowISO(),
  });
  socket.emit("room:joined", { room: roomName });
  socket.emit("chat:history", getRecentMessages(roomName));
  emitUsersUpdate([previous, roomName]);
  broadcastTyping();
};

io.on("connection", (socket) => {
  // Send current available colors on connection
  socket.emit("colors:update", {
    available: getAvailableColors(),
    taken: getOnlineColors(),
  });
  socket.emit("rooms:update", { rooms: roomsWithCounts() });

  socket.on("colors:get", () => {
    socket.emit("colors:update", {
      available: getAvailableColors(),
      taken: getOnlineColors(),
    });
  });

  socket.on(
    "join",
    (
      payload:
        | string
        | {
            username: string;
            color?: string;
            password?: string;
          },
    ) => {
      const rawName = typeof payload === "string" ? payload : payload?.username;
      const requestedColor =
        typeof payload === "object" ? payload?.color : undefined;
      const adminPassword =
        typeof payload === "object" ? payload?.password : undefined;

      const adminCheck = checkAdminPassword(rawName, adminPassword);
      if (!adminCheck.ok) {
        socket.emit("join:error", {
          message: adminCheck.error,
          code: "admin_password_required",
        });
        return;
      }

      const result = registerOrValidateUser(rawName, requestedColor);
      if (!result.success) {
        socket.emit("join:error", { message: result.error });
        return;
      }

      users.set(socket.id, { ...result.user, isAdmin: adminCheck.isAdmin, room: "" });
      setUserOnline(result.user.name, true);

      socket.emit("joined", publicUser(users.get(socket.id)!));
      joinRoom(socket, DEFAULT_ROOM);
      socket.emit("rooms:update", { rooms: roomsWithCounts() });
    },
  );

  socket.on("rooms:list", () => {
    socket.emit("rooms:update", { rooms: roomsWithCounts() });
  });

  socket.on("room:create", ({ name }: { name?: string }) => {
    const user = users.get(socket.id);
    if (!user || !user.isAdmin) {
      socket.emit("room:error", {
        message: "Solo el administrador puede crear salas.",
      });
      return;
    }
    const validation = validateRoomName(name ?? "");
    if (!validation.valid) {
      socket.emit("room:error", { message: validation.error! });
      return;
    }
    if (roomExists(validation.cleanName)) {
      socket.emit("room:error", { message: "Ya existe una sala con ese nombre." });
      return;
    }
    createRoom(validation.cleanName, user.name);
    io.emit("system", {
      text: `${user.name} creó la sala «${validation.cleanName}»`,
      time: nowISO(),
    });
    io.emit("rooms:update", { rooms: roomsWithCounts() });
    joinRoom(socket, validation.cleanName);
  });

  socket.on("room:join", ({ name }: { name?: string }) => {
    const user = users.get(socket.id);
    if (!user) return;
    const target = String(name ?? "").trim();
    if (!roomExists(target)) {
      socket.emit("room:error", { message: "La sala no existe." });
      return;
    }
    joinRoom(socket, target);
  });

  socket.on("user:kick", ({ name }: { name?: string }) => {
    const admin = users.get(socket.id);
    if (!admin || !admin.isAdmin) {
      socket.emit("kick:error", {
        message: "Solo el administrador puede sacar usuarios de la sala.",
      });
      return;
    }
    const wanted = String(name ?? "").toLowerCase();
    const entry = usersInRoom(admin.room).find(
      (u) => u.name.toLowerCase() === wanted && u.name !== admin.name,
    );
    if (!entry) return;
    const targetSocketId = entry.id;
    io.to(targetSocketId).emit("kicked", { by: admin.name, room: admin.room });
    removeSocketSession(
      targetSocketId,
      `${entry.name} fue sacado de la sala por ${admin.name}`,
    );
    setTimeout(() => {
      io.sockets.sockets.get(targetSocketId)?.disconnect(true);
    }, 250);
  });

  socket.on("chat:message", ({ type, content }) => {
    const session = users.get(socket.id);
    if (!session || !session.room) return;
    const kind: "sticker" | "texto" =
      type === "sticker" ? "sticker" : "texto";

    let payload: string;
    if (kind === "sticker") {
      const url = String(content ?? "");
      if (!/^https:\/\/media\d*\.giphy\.com\/media\/.+\.gif/.test(url)) return;
      payload = url;
    } else {
      const clean = String(content ?? "").trim().slice(0, 500);
      if (!clean) return;
      payload = clean;
    }

    if (typing.delete(socket.id)) broadcastTyping();
    const message = {
      id: randomUUID(),
      user: session.name,
      color: session.color,
      type: kind,
      content: payload,
      time: nowISO(), // ISO 8601 UTC
    };
    saveMessage({ ...message, room: session.room });
    io.to(session.room).emit("chat:message", message);
  });

  socket.on("typing", () => {
    const session = users.get(socket.id);
    if (!session) return;
    if (typing.has(socket.id)) return;
    typing.set(socket.id, { name: session.name, color: session.color });
    broadcastTyping();
  });

  socket.on("typing:stop", () => {
    if (typing.delete(socket.id)) broadcastTyping();
  });

  socket.on("disconnect", () => {
    removeSocketSession(socket.id);
  });
});

httpServer.listen(Number(process.env.PORT) || 3111, () => {
  console.log("Server is running on port", process.env.PORT || 3111);
});
