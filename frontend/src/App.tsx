import { useEffect, useMemo, useRef, useState } from "react";
import { socket } from "./services/socket";
import { PALETTE } from "./constants/colors";
import { JoinScreen } from "./components/join/JoinScreen";
import { ReloadScreen } from "./components/join/ReloadScreen";
import { KickedScreen } from "./components/join/KickedScreen";
import { ChatScreen } from "./components/chat/ChatScreen";
import type {
  ChatMessage,
  Item,
  OnlineUser,
  RoomInfo,
  SystemNote,
  Toast,
} from "./types/chat";
import type { Sticker } from "./types/stickers";
import {
  clearSession,
  loadSession,
  saveSession,
  type PersistedSession,
} from "./utils/session";
import "./App.css";

function App() {
  const initialSession = useMemo(() => loadSession(), []);

  const [selectedColor, setSelectedColor] = useState<string>(
    initialSession?.color && (PALETTE as readonly string[]).includes(initialSession.color)
      ? initialSession.color
      : "",
  );
  const [availableColors, setAvailableColors] = useState<string[]>([...PALETTE]);
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [needsAdminPassword, setNeedsAdminPassword] = useState(false);

  const [username, setUsername] = useState(initialSession?.username ?? "");
  const [myColor, setMyColor] = useState<string>(initialSession?.color ?? "#9aa0b3");
  const [isAdmin, setIsAdmin] = useState(initialSession?.isAdmin ?? false);
  const [items, setItems] = useState<Item[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState("");
  const [kickedBy, setKickedBy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [typingUsers, setTypingUsers] = useState<OnlineUser[]>([]);
  const [connected, setConnected] = useState(socket.connected);
  const [reconnecting, setReconnecting] = useState<boolean>(!!initialSession);

  const usernameRef = useRef(initialSession?.username ?? "");
  const toastTimer = useRef<number | null>(null);
  const typingTimer = useRef<number | null>(null);

  // Refs de sesión que persisten entre renders (sin disparar re-renders)
  const sessionRef = useRef<PersistedSession | null>(initialSession);
  const joinedRef = useRef<boolean>(false);

  // Fetch initial colors from API (FASE 1)
  useEffect(() => {
    fetch("/api/colors")
      .then((res) => res.json())
      .then((data) => {
        if (data.available) setAvailableColors(data.available);
        if (data.taken) setTakenColors(data.taken);
        if (data.available && data.available.length > 0 && !selectedColor) {
          setSelectedColor(data.available[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Socket event listeners
  useEffect(() => {
    const onMessage = (message: ChatMessage) => {
      const own = message.user === usernameRef.current;
      setItems((prev) => [
        ...prev,
        {
          kind: "message",
          message,
          own,
        },
      ]);
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

    const onHistory = (history: ChatMessage[]) => {
      setItems(
        history.map((message) => ({
          kind: "message" as const,
          message,
          own: message.user === usernameRef.current,
        })),
      );
    };

    const onUsers = ({ users }: { users: OnlineUser[] }) => setOnline(users);

    const onRooms = ({ rooms }: { rooms: RoomInfo[] }) => setRooms(rooms);

    const onRoomJoined = ({ room }: { room: string }) => {
      setCurrentRoom(room);
      setItems([]);
    };

    const onRoomError = ({ message }: { message: string }) => {
      setToast({ user: "Salas", color: "#ff8fa3", text: message });
    };

    const onColors = ({
      available,
      taken,
    }: {
      available: string[];
      taken: string[];
    }) => {
      setAvailableColors(available);
      setTakenColors(taken);
      setSelectedColor((current) => {
        if (current && available.includes(current)) return current;
        return available[0] || "";
      });
    };

    const onTyping = ({ users }: { users: OnlineUser[] }) =>
      setTypingUsers(users);

    const onJoined = (u: { name: string; color: string; isAdmin?: boolean }) => {
      const adminFlag = !!u.isAdmin;
      usernameRef.current = u.name;
      sessionRef.current = {
        username: u.name,
        color: u.color,
        isAdmin: adminFlag,
      };
      joinedRef.current = true;
      saveSession(sessionRef.current);
      setMyColor(u.color);
      setIsAdmin(adminFlag);
      setJoinError(null);
      setNeedsAdminPassword(false);
      setReconnecting(false);
    };

    const onJoinError = ({
      message,
      code,
    }: {
      message: string;
      code?: string;
    }) => {
      // Si veníamos de un auto-rejoin y falló, limpiamos la sesión persistida
      // y mandamos al usuario a la pantalla de join (con sus datos preservados en el error).
      if (!joinedRef.current && sessionRef.current) {
        const previous = sessionRef.current;
        clearSession();
        sessionRef.current = null;
        setReconnecting(false);
        setUsername("");
        setMyColor("#9aa0b3");
        setIsAdmin(false);
        // Pre-seleccionamos su nombre/color anterior para que reingresar sea 1 click.
        usernameRef.current = "";
        if ((PALETTE as readonly string[]).includes(previous.color)) setSelectedColor(previous.color);
        setJoinError(message);
        if (code === "admin_password_required") {
          setNeedsAdminPassword(true);
        }
        return;
      }

      setJoinError(message);
      if (code === "admin_password_required") {
        setNeedsAdminPassword(true);
      } else {
        setUsername("");
        usernameRef.current = "";
      }
    };

    const onKicked = ({ by }: { by: string; room: string }) => {
      // Kick explícito del admin: invalidamos la sesión persistida.
      clearSession();
      sessionRef.current = null;
      joinedRef.current = false;
      usernameRef.current = "";
      setUsername("");
      setIsAdmin(false);
      setCurrentRoom("");
      setItems([]);
      setTypingUsers([]);
      setOnline([]);
      setKickedBy(by);
    };

    socket.on("chat:message", onMessage);
    socket.on("system", onSystem);
    socket.on("users:update", onUsers);
    socket.on("rooms:update", onRooms);
    socket.on("room:joined", onRoomJoined);
    socket.on("room:error", onRoomError);
    socket.on("colors:update", onColors);
    socket.on("users:typing", onTyping);
    socket.on("joined", onJoined);
    socket.on("join:error", onJoinError);
    socket.on("kicked", onKicked);
    socket.on("chat:history", onHistory);

    const onConnect = () => {
      setConnected(true);
      // Si teníamos una sesión previa y el socket se reconectó
      // (recarga de página o pérdida de conexión), re-unimos silenciosamente.
      const pending = sessionRef.current;
      if (pending) {
        joinedRef.current = false;
        setReconnecting(true);
        socket.emit("join", {
          username: pending.username,
          color: pending.color,
        });
      }
    };
    const onDisconnect = () => {
      setConnected(false);
      // El server nos va a marcar offline; cuando volvamos a conectar hay que re-unir.
      joinedRef.current = false;
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("system", onSystem);
      socket.off("users:update", onUsers);
      socket.off("rooms:update", onRooms);
      socket.off("room:joined", onRoomJoined);
      socket.off("room:error", onRoomError);
      socket.off("colors:update", onColors);
      socket.off("users:typing", onTyping);
      socket.off("joined", onJoined);
      socket.off("join:error", onJoinError);
      socket.off("kicked", onKicked);
      socket.off("chat:history", onHistory);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  // Si en el primer mount el socket ya estaba conectado (caso típico al recargar
  // la pestaña) y hay sesión guardada, disparamos el rejoin manualmente.
  useEffect(() => {
    if (socket.connected && sessionRef.current && !joinedRef.current) {
      setReconnecting(true);
      socket.emit("join", {
        username: sessionRef.current.username,
        color: sessionRef.current.color,
      });
    }
  }, []);

  // Auto-dismiss toast timer
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

  const handleJoin = async (
    name: string,
    color: string,
    password?: string,
  ) => {
    setJoinError(null);
    setReconnecting(false);

    // A kicked session was disconnected server-side: reconnect first
    // (Socket.IO clients do NOT auto-reconnect after server disconnect)
    if (!socket.connected) {
      socket.connect();
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, 3000);
        socket.once("connect", () => {
          window.clearTimeout(timer);
          resolve();
        });
      });
    }

    try {
      // Direct server verification via HTTP to ensure 400 Bad Request if occupied or invalid
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, color, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setJoinError(data.error || "Error al unirse al chat.");
        if (data.code === "admin_password_required") {
          setNeedsAdminPassword(true);
        }
        return;
      }

      const { user } = await response.json();
      usernameRef.current = user.name;
      setUsername(user.name);
      setMyColor(user.color);
      setIsAdmin(!!user.isAdmin);
      setNeedsAdminPassword(false);

      // Join socket session
      socket.emit("join", {
        username: user.name,
        color: user.color,
        password,
      });

      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch {
      // Fallback directly to socket
      usernameRef.current = name;
      setUsername(name);
      socket.emit("join", { username: name, color, password });
    }
  };

  const handleSwitchRoom = (room: string) => {
    if (room && room !== currentRoom) {
      socket.emit("room:join", { name: room });
    }
  };

  const handleCreateRoom = (name: string) => {
    socket.emit("room:create", { name });
  };

  const handleKickUser = (name: string) => {
    socket.emit("user:kick", { name });
  };

  const handleSendMessage = (content: string) => {
    stopTyping();
    socket.emit("chat:message", { type: "texto", content });
  };

  const handleSendSticker = (sticker: Sticker) => {
    socket.emit("chat:message", { type: "sticker", content: sticker.full });
  };

  // Logout manual: el usuario decide salir del chat desde el profile menu.
  // Limpiamos sesión persistida, desconectamos el socket (para que el server
  // nos marque offline), y reseteamos el estado local.
  const handleLogout = () => {
    clearSession();
    sessionRef.current = null;
    joinedRef.current = false;
    usernameRef.current = "";
    // No usamos removeAllListeners() porque rompe los handlers internos de
    // socket.io (auto-reconnect). Sólo desconectamos: el server nos marca
    // offline y el siguiente join se hace explícito desde el JoinScreen.
    socket.disconnect();
    setUsername("");
    setMyColor("#9aa0b3");
    setIsAdmin(false);
    setItems([]);
    setOnline([]);
    setRooms([]);
    setTypingUsers([]);
    setCurrentRoom("");
    setKickedBy(null);
    setReconnecting(false);
    setJoinError(null);
    setNeedsAdminPassword(false);
  };

  // Estado de reconexión: hay sesión guardada pero todavía no terminó el round-trip.
  if (reconnecting && !kickedBy) {
    return (
      <main className="join">
        <div className="join-card" style={{ textAlign: "center", gap: 14 }}>
          <h1>Chat Grupal</h1>
          <p className="join-hint">
            Reanudando tu sesión como{" "}
            <strong style={{ color: myColor }}>{username || initialSession?.username}</strong>
            ...
          </p>
          <button
            className="join-button"
            type="button"
            onClick={handleLogout}
            style={{ background: "var(--surface-2)", color: "var(--text)" }}
          >
            Cancelar
          </button>
        </div>
      </main>
    );
  }

  if (!connected && !username && !kickedBy) {
    return <ReloadScreen />;
  }

  if (kickedBy) {
    return <KickedScreen kickedBy={kickedBy} onRejoin={() => setKickedBy(null)} />;
  }

  if (!username) {
    return (
      <JoinScreen
        selectedColor={selectedColor}
        availableColors={availableColors}
        takenColors={takenColors}
        joinError={joinError}
        needsAdminPassword={needsAdminPassword}
        onSelectColor={setSelectedColor}
        onClearError={() => setJoinError(null)}
        onJoin={handleJoin}
      />
    );
  }

  return (
    <ChatScreen
      username={username}
      myColor={myColor}
      isAdmin={isAdmin}
      currentRoom={currentRoom}
      rooms={rooms}
      items={items}
      online={online}
      typingUsers={typingUsers}
      toast={toast}
      onDismissToast={() => setToast(null)}
      onSendMessage={handleSendMessage}
      onSendSticker={handleSendSticker}
      onTyping={notifyTyping}
      onStopTyping={stopTyping}
      onSwitchRoom={handleSwitchRoom}
      onCreateRoom={handleCreateRoom}
      onKickUser={handleKickUser}
      onLogout={handleLogout}
    />
  );
}

export default App;
