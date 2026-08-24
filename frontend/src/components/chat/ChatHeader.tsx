import type { OnlineUser, RoomInfo } from "../../types/chat";
import { RoomSelector } from "./RoomSelector";

type Props = {
  username: string;
  myColor: string;
  online: OnlineUser[];
  isAdmin: boolean;
  currentRoom: string;
  rooms: RoomInfo[];
  onTogglePanel: () => void;
  onSwitchRoom: (room: string) => void;
  onCreateRoom: (name: string) => void;
};

export function ChatHeader({
  username,
  myColor,
  online,
  isAdmin,
  currentRoom,
  rooms,
  onTogglePanel,
  onSwitchRoom,
  onCreateRoom,
}: Props) {
  return (
    <header className="chat-header">
      <div className="chat-header-left">
        <h1>
          Chat Grupal{" "}
          <span className="chat-me" style={{ color: myColor }}>
            · {username}
          </span>
          {isAdmin && (
            <span className="admin-badge" title="Sesión de administrador">
              ADMIN
            </span>
          )}
        </h1>
        <RoomSelector
          rooms={rooms}
          currentRoom={currentRoom}
          isAdmin={isAdmin}
          onSwitchRoom={onSwitchRoom}
          onCreateRoom={onCreateRoom}
        />
      </div>

      <div className="chat-header-right">
        <div className="presence" title={online.map((u) => u.name).join(", ")}>
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
        <button
          type="button"
          className="presence-toggle"
          onClick={onTogglePanel}
          title="Ver personas en la sala"
        >
          👥
        </button>
      </div>
    </header>
  );
}
