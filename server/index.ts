import express from "express";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import { getOrCreateUser, getRecentMessages, saveMessage } from "./db.js";
import { getStickers } from "./giphy.js";

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

if (existsSync(indexHtml)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(indexHtml);
  });
}

const users = new Map<string, { name: string; color: string }>();
const typing = new Map<string, { name: string; color: string }>();

app.get("/api/stickers", async (req, res) => {
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

const now = () =>
  new Date().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

const broadcastUsers = () => {
  const list = [...users.values()];
  io.emit("users:update", { users: list, count: list.length });
};

const broadcastTyping = () => {
  io.emit("users:typing", { users: [...typing.values()] });
};

io.on("connection", (socket) => {
  socket.on("join", (username) => {
    const user = getOrCreateUser(username);
    users.set(socket.id, user);
    socket.emit("joined", user);
    socket.emit("chat:history", getRecentMessages());
    io.emit("system", { text: `${user.name} se unió al chat`, time: now() });
    broadcastUsers();
  });

  socket.on("chat:message", ({ type, content }) => {
    const user = users.get(socket.id) ?? { name: "Anónimo", color: "#9aa0b3" };
    const kind: "sticker" | "texto" =
      type === "sticker" ? "sticker" : "texto";

    let payload: string;
    if (kind === "sticker") {
      const url = String(content ?? "");
      if (!/^https:\/\/media\.giphy\.com\/media\/.+\.gif/.test(url)) return;
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
      time: now(),
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
      io.emit("system", { text: `${user.name} salió del chat`, time: now() });
      broadcastUsers();
      broadcastTyping();
    }
  });
});

httpServer.listen(3111, () => {
  console.log("Server is running on port 3111");
});
