import express from "express";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import {
  getAvailableColors,
  getOnlineColors,
  getRecentMessages,
  registerOrValidateUser,
  resetAllUsersOffline,
  saveMessage,
  setUserOnline,
} from "./db.js";
import { ALLOWED_PALETTE, validateUsernameFormat } from "./config.js";
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
  const { username, color } = req.body ?? {};
  const result = registerOrValidateUser(username, color);
  if (!result.success) {
    return res.status(result.status).json({ error: result.error });
  }
  return res.json({ user: result.user, availableColors: getAvailableColors() });
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

const users = new Map<string, { name: string; color: string }>();
const typing = new Map<string, { name: string; color: string }>();

// Generates ISO 8601 UTC timestamp (FASE 2)
const nowISO = () => new Date().toISOString();

const broadcastUsers = () => {
  const list = [...users.values()];
  io.emit("users:update", { users: list, count: list.length });
  io.emit("colors:update", {
    available: getAvailableColors(),
    taken: getOnlineColors(),
  });
};

const broadcastTyping = () => {
  io.emit("users:typing", { users: [...typing.values()] });
};

io.on("connection", (socket) => {
  // Send current available colors on connection
  socket.emit("colors:update", {
    available: getAvailableColors(),
    taken: getOnlineColors(),
  });

  socket.on("colors:get", () => {
    socket.emit("colors:update", {
      available: getAvailableColors(),
      taken: getOnlineColors(),
    });
  });

  socket.on("join", (payload: string | { username: string; color?: string }) => {
    const rawName = typeof payload === "string" ? payload : payload?.username;
    const requestedColor = typeof payload === "object" ? payload?.color : undefined;

    const result = registerOrValidateUser(rawName, requestedColor);
    if (!result.success) {
      socket.emit("join:error", { message: result.error });
      return;
    }

    const user = result.user;
    users.set(socket.id, user);
    setUserOnline(user.name, true);

    socket.emit("joined", user);
    socket.emit("chat:history", getRecentMessages());
    io.emit("system", {
      text: `${user.name} se unió al chat`,
      time: nowISO(),
    });
    broadcastUsers();
  });

  socket.on("chat:message", ({ type, content }) => {
    const user = users.get(socket.id) ?? { name: "Anónimo", color: "#9aa0b3" };
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
      user: user.name,
      color: user.color,
      type: kind,
      content: payload,
      time: nowISO(), // ISO 8601 UTC
    };
    saveMessage(message);
    io.emit("chat:message", message);
  });

  socket.on("typing", () => {
    const user = users.get(socket.id);
    if (!user) return;
    if (typing.has(socket.id)) return;
    typing.set(socket.id, user);
    broadcastTyping();
  });

  socket.on("typing:stop", () => {
    if (typing.delete(socket.id)) broadcastTyping();
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user) {
      users.delete(socket.id);
      typing.delete(socket.id);
      setUserOnline(user.name, false);
      io.emit("system", {
        text: `${user.name} salió del chat`,
        time: nowISO(),
      });
      broadcastUsers();
      broadcastTyping();
    }
  });
});

httpServer.listen(3111, () => {
  console.log("Server is running on port 3111");
});
