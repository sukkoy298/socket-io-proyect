import { useEffect, useRef, useState } from "react";
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
import "./App.css";

function App() {
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [availableColors, setAvailableColors] = useState<string[]>([...PALETTE]);
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [needsAdminPassword, setNeedsAdminPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [myColor, setMyColor] = useState("#9aa0b3");
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState("");
  const [kickedBy, setKickedBy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [typingUsers, setTypingUsers] = useState<OnlineUser[]>([]);
  const [connected, setConnected] = useState(socket.connected);

  const usernameRef = useRef("");
  const toastTimer = useRef<number | null>(null);
  const typingTimer = useRef<number | null>(null);

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
      setMyColor(u.color);
      setIsAdmin(!!u.isAdmin);
      setJoinError(null);
      setNeedsAdminPassword(false);
    };

    const onJoinError = ({
      message,
      code,
    }: {
      message: string;
      code?: string;
    }) => {
      setJoinError(message);
      if (code === "admin_password_required") {
        setNeedsAdminPassword(true);
      } else {
        setUsername("");
        usernameRef.current = "";
      }
    };

    const onKicked = ({ by }: { by: string; room: string }) => {
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

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
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
    />
  );
}

export default App;
