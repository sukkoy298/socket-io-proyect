import type { OnlineUser, RoomInfo } from "../../types/chat";
import { RoomSelector } from "./RoomSelector";
import { ProfileMenu } from "./ProfileMenu";

type Props = {
  username: string;
  myColor: string;
  isAdmin: boolean;
  online: OnlineUser[];
  currentRoom: string;
  rooms: RoomInfo[];
  profileOpen: boolean;
  onTogglePanel: () => void;
  onToggleProfile: () => void;
  onCloseProfile: () => void;
  onSwitchRoom: (room: string) => void;
  onCreateRoom: (name: string) => void;
  onLogout: () => void;
};

export function ChatHeader({
  username,
  myColor,
  isAdmin,
  online,
  currentRoom,
  rooms,
  profileOpen,
  onTogglePanel,
  onToggleProfile,
  onCloseProfile,
  onSwitchRoom,
  onCreateRoom,
  onLogout,
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
        <ProfileMenu
          username={username}
          myColor={myColor}
          isAdmin={isAdmin}
          open={profileOpen}
          onToggle={onToggleProfile}
          onClose={onCloseProfile}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}
