import express from "express";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { Server } from "socket.io";
import cors from "cors";
import morgan from "morgan";
import { getOrCreateUser } from "./db.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" },
});

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

const users = new Map<string, { name: string; color: string }>();
const typing = new Map<string, { name: string; color: string }>();

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
    io.emit("system", { text: `${user.name} se unió al chat`, time: now() });
    broadcastUsers();
  });

  socket.on("chat:message", ({ text }) => {
    const clean = String(text ?? "").trim().slice(0, 500);
    if (!clean) return;
    const user = users.get(socket.id) ?? { name: "Anónimo", color: "#9aa0b3" };
    if (typing.delete(socket.id)) broadcastTyping();
    io.emit("chat:message", {
      id: randomUUID(),
      user: user.name,
      color: user.color,
      text: clean,
      time: now(),
    });
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
