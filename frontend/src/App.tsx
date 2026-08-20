import { useEffect, useRef, useState } from "react";
import { socket } from "./services/socket";
import { PALETTE } from "./constants/colors";
import { JoinScreen } from "./components/join/JoinScreen";
import { ReloadScreen } from "./components/join/ReloadScreen";
import { ChatScreen } from "./components/chat/ChatScreen";
import type { ChatMessage, Item, OnlineUser, SystemNote, Toast } from "./types/chat";
import type { Sticker } from "./types/stickers";
import "./App.css";

function App() {
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [availableColors, setAvailableColors] = useState<string[]>([...PALETTE]);
  const [takenColors, setTakenColors] = useState<string[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [myColor, setMyColor] = useState("#9aa0b3");
  const [items, setItems] = useState<Item[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);
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

    const onJoined = (u: { name: string; color: string }) => {
      setMyColor(u.color);
      setJoinError(null);
    };

    const onJoinError = ({ message }: { message: string }) => {
      setJoinError(message);
      setUsername("");
      usernameRef.current = "";
    };

    socket.on("chat:message", onMessage);
    socket.on("system", onSystem);
    socket.on("users:update", onUsers);
    socket.on("colors:update", onColors);
    socket.on("users:typing", onTyping);
    socket.on("joined", onJoined);
    socket.on("join:error", onJoinError);
    socket.on("chat:history", onHistory);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("chat:message", onMessage);
      socket.off("system", onSystem);
      socket.off("users:update", onUsers);
      socket.off("colors:update", onColors);
      socket.off("users:typing", onTyping);
      socket.off("joined", onJoined);
      socket.off("join:error", onJoinError);
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

  const handleJoin = async (name: string, color: string) => {
    setJoinError(null);

    try {
      // Direct server verification via HTTP to ensure 400 Bad Request if occupied or invalid
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: name, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        setJoinError(data.error || "Error al unirse al chat.");
        return;
      }

      const { user } = await response.json();
      usernameRef.current = user.name;
      setUsername(user.name);
      setMyColor(user.color);

      // Join socket session
      socket.emit("join", { username: user.name, color: user.color });

      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    } catch {
      // Fallback directly to socket
      usernameRef.current = name;
      setUsername(name);
      socket.emit("join", { username: name, color });
    }
  };

  const handleSendMessage = (content: string) => {
    stopTyping();
    socket.emit("chat:message", { type: "texto", content });
  };

  const handleSendSticker = (sticker: Sticker) => {
    socket.emit("chat:message", { type: "sticker", content: sticker.full });
  };

  if (!connected && !username) {
    return <ReloadScreen />;
  }

  if (!username) {
    return (
      <JoinScreen
        selectedColor={selectedColor}
        availableColors={availableColors}
        takenColors={takenColors}
        joinError={joinError}
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
      items={items}
      online={online}
      typingUsers={typingUsers}
      toast={toast}
      onDismissToast={() => setToast(null)}
      onSendMessage={handleSendMessage}
      onSendSticker={handleSendSticker}
      onTyping={notifyTyping}
      onStopTyping={stopTyping}
    />
  );
}

export default App;
