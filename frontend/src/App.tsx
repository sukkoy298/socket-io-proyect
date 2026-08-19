import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SmileyIcon, StickerPicker } from "./StickerPicker";
import type { Sticker } from "./stickers";
import "./App.css";

const socket = io();

type ChatMessage = {
  id: string;
  user: string;
  color: string;
  type: "texto" | "sticker";
  content: string;
  time: string;
};

type SystemNote = {
  text: string;
  time: string;
};

type OnlineUser = {
  name: string;
  color: string;
};

type Item =
  | { kind: "message"; message: ChatMessage; own: boolean }
  | { kind: "system"; note: SystemNote };

type Toast = {
  user: string;
  color: string;
  text: string;
};

function App() {
  const [nameInput, setNameInput] = useState("");
  const [username, setUsername] = useState("");
  const [myColor, setMyColor] = useState("#9aa0b3");
  const [items, setItems] = useState<Item[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [text, setText] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [typingUsers, setTypingUsers] = useState<OnlineUser[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef("");
  const toastTimer = useRef<number | null>(null);
  const typingTimer = useRef<number | null>(null);

  useEffect(() => {
    const onMessage = (message: ChatMessage) => {
      setItems((prev) => [
        ...prev,
        {
          kind: "message",
          message,
          own: message.user === usernameRef.current,
        },
      ]);
      const own = message.user === usernameRef.current;
      if (!own) {
        if (
          "Notification" in window &&
          document.hidden &&
          Notification.permission === "granted"
        ) {
          const notification = new Notification(message.user, {
            body:
              message.type === "sticker"
                ? "Envió un sticker"
                : message.content,
          });
          notification.onclick = () => window.focus();
        }
        setToast({
          user: message.user,
          color: message.color,
          text:
            message.type === "sticker"
              ? "envió un sticker"
              : message.content,
        });
      }
    };
    const onSystem = (note: SystemNote) =>
      setItems((prev) => [...prev, { kind: "system", note }]);
    const onHistory = (history: ChatMessage[]) =>
      setItems((prev) => [
        ...history.map((message) => ({
          kind: "message" as const,
          message,
          own: message.user === usernameRef.current,
        })),
        ...prev,
      ]);
    const onUsers = ({ users }: { users: OnlineUser[] }) => setOnline(users);
    const onTyping = ({ users }: { users: OnlineUser[] }) =>
      setTypingUsers(users);
    const onJoined = (u: { name: string; color: string }) =>
      setMyColor(u.color);

    socket.on("chat:message", onMessage);
    socket.on("system", onSystem);
    socket.on("users:update", onUsers);
    socket.on("users:typing", onTyping);
    socket.on("joined", onJoined);
    socket.on("chat:history", onHistory);
    return () => {
      socket.off("chat:message", onMessage);
      socket.off("system", onSystem);
      socket.off("users:update", onUsers);
      socket.off("users:typing", onTyping);
      socket.off("joined", onJoined);
      socket.off("chat:history", onHistory);
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [items]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 4000);
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const stopTyping = () => {
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    socket.emit("typing:stop");
  };

  const notifyTyping = () => {
    socket.emit("typing");
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(stopTyping, 1500);
  };

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    usernameRef.current = name;
    setUsername(name);
    socket.emit("join", name);
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    stopTyping();
    socket.emit("chat:message", { type: "texto", content: clean });
    setText("");
  };

  const pickSticker = (sticker: Sticker) => {
    setPickerOpen(false);
    socket.emit("chat:message", { type: "sticker", content: sticker.full });
  };

  if (!username) {
    return (
      <main className="join">
        <form className="join-card" onSubmit={join}>
          <h1>Chat Grupal</h1>
          <p className="join-hint">
            Elegí un nombre para entrar a la conversación.
          </p>
          <input
            className="join-input"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Tu nombre"
            maxLength={20}
            autoFocus
          />
          <button className="join-button" type="submit">
            Entrar al chat
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="chat">
      {toast && (
        <button
          className="chat-toast"
          onClick={() => {
            setToast(null);
            window.focus();
          }}
        >
          <span
            className="chat-toast-dot"
            style={{ background: toast.color }}
          />
          <span className="chat-toast-user" style={{ color: toast.color }}>
            {toast.user}
          </span>
          <span className="chat-toast-text">{toast.text}</span>
        </button>
      )}
      <header className="chat-header">
        <h1>
          Chat Grupal{" "}
          <span className="chat-me" style={{ color: myColor }}>
            · {username}
          </span>
        </h1>
        <div
          className="presence"
          title={online.map((u) => u.name).join(", ")}
        >
          <span className="presence-dots">
            {online.slice(0, 5).map((u, i) => (
              <span
                key={`${u.name}-${i}`}
                className="presence-dot"
                style={{ background: u.color, borderColor: u.color }}
              />
            ))}
          </span>
          <span className="presence-count">{online.length} en línea</span>
        </div>
      </header>

      <div className="chat-list" ref={listRef}>
        {items.length === 0 && (
          <p className="chat-empty">
            Todavía no hay mensajes. Escribí el primero.
          </p>
        )}
        {items.map((item, i) =>
          item.kind === "system" ? (
            <p key={i} className="chat-system">
              {item.note.text}
              <span>{item.note.time}</span>
            </p>
          ) : (
            <div
              key={item.message.id}
              className={`chat-message ${item.own ? "own" : ""}`}
            >
              <div className="message-body">
                <span className="message-meta">
                  <span
                    className="message-user"
                    style={{ color: item.message.color }}
                  >
                    {item.message.user}
                  </span>
                  <span className="message-time">{item.message.time}</span>
                </span>
                {item.message.type === "sticker" ? (
                  <img
                    className="message-sticker"
                    src={item.message.content}
                    alt={`Sticker de ${item.message.user}`}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <p className="message-text">{item.message.content}</p>
                )}
              </div>
            </div>
          )
        )}
      </div>

      <footer className="chat-footer">
        <div className={`chat-typing ${typingUsers.length ? "active" : ""}`}>
          {typingUsers.length > 0 && (
            <p>
              <span className="typing-names">
                {typingUsers.map((u) => u.name).join(", ")}
              </span>{" "}
              {typingUsers.length === 1 ? "está" : "están"} escribiendo
              <span className="typing-dots">
                <span />
                <span />
                <span />
              </span>
            </p>
          )}
        </div>
        <form className="chat-input" onSubmit={send}>
          <button
            type="button"
            className={`sticker-button ${pickerOpen ? "active" : ""}`}
            aria-label="Abrir selector de stickers"
            aria-expanded={pickerOpen}
            onClick={() => setPickerOpen((open) => !open)}
          >
            <SmileyIcon />
          </button>
          <input
            value={text}
            onChange={(e) => {
              const value = e.target.value;
              setText(value);
              if (value.trim()) notifyTyping();
              else stopTyping();
            }}
            placeholder={`Escribí un mensaje como ${username}...`}
            maxLength={500}
            autoFocus
          />
          <button type="submit">Enviar</button>
        </form>
        {pickerOpen && (
          <StickerPicker
            onClose={() => setPickerOpen(false)}
            onPick={pickSticker}
          />
        )}
      </footer>
    </main>
  );
}

export default App;
