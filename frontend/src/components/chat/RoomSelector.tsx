import { useState } from "react";
import type { RoomInfo } from "../../types/chat";

type Props = {
  rooms: RoomInfo[];
  currentRoom: string;
  isAdmin: boolean;
  onSwitchRoom: (room: string) => void;
  onCreateRoom: (name: string) => void;
};

export function RoomSelector({
  rooms,
  currentRoom,
  isAdmin,
  onSwitchRoom,
  onCreateRoom,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const handleCreate = () => {
    const clean = newRoomName.trim();
    if (!clean) return;
    onCreateRoom(clean);
    setNewRoomName("");
    setCreating(false);
  };

  return (
    <div className="room-selector">
      <label className="room-selector-label" htmlFor="room-select">
        Sala
      </label>
      <select
        id="room-select"
        className="room-selector-select"
        value={currentRoom}
        onChange={(e) => onSwitchRoom(e.target.value)}
      >
        {rooms.map((r) => (
          <option key={r.name} value={r.name}>
            # {r.name} ({r.userCount})
          </option>
        ))}
        {rooms.length > 0 && !rooms.some((r) => r.name === currentRoom) && (
          <option value={currentRoom}># {currentRoom}</option>
        )}
      </select>

      {isAdmin &&
        (creating ? (
          <div className="room-create-box">
            <input
              className="room-create-input"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              placeholder="Nombre de la sala"
              maxLength={24}
              autoFocus
            />
            <button
              type="button"
              className="room-create-btn"
              onClick={handleCreate}
            >
              Crear
            </button>
            <button
              type="button"
              className="room-cancel-btn"
              onClick={() => setCreating(false)}
              aria-label="Cancelar creación de sala"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="room-new-btn"
            onClick={() => setCreating(true)}
          >
            + Sala
          </button>
        ))}
    </div>
  );
}
