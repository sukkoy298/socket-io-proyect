import type { OnlineUser } from "../../types/chat";

type Props = {
  online: OnlineUser[];
  username: string;
  isAdmin: boolean;
  open: boolean;
  onClose: () => void;
  onKickUser: (name: string) => void;
};

export function OnlineUsersPanel({
  online,
  username,
  isAdmin,
  open,
  onClose,
  onKickUser,
}: Props) {
  return (
    <aside className={`online-panel ${open ? "open" : ""}`}>
      <div className="online-panel-header">
        <h2>En sala · {online.length}</h2>
        <button
          type="button"
          className="online-panel-close"
          onClick={onClose}
          aria-label="Cerrar lista de usuarios"
        >
          ✕
        </button>
      </div>

      {online.length === 0 ? (
        <p className="online-panel-empty">Nadie más está en línea.</p>
      ) : (
        <ul className="online-list">
          {online.map((u, i) => {
            const isMe = u.name === username;
            const canKick = isAdmin && !isMe;
            return (
              <li
                key={`${u.name}-${i}`}
                className={`online-item ${isMe ? "me" : ""}`}
              >
                <span
                  className="online-dot"
                  style={{ background: u.color }}
                />
                <span className="online-name" style={{ color: u.color }}>
                  {u.name}
                  {u.isAdmin && (
                    <span className="admin-badge" title="Administrador">
                      ADMIN
                    </span>
                  )}
                </span>
                {canKick && (
                  <button
                    type="button"
                    className="kick-btn"
                    title={`Sacar a ${u.name} de la sala`}
                    onClick={() => onKickUser(u.name)}
                  >
                    Sacar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
