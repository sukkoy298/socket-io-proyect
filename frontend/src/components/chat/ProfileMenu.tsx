import { useEffect, useRef } from "react";

type Props = {
  username: string;
  myColor: string;
  isAdmin: boolean;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onLogout: () => void;
};

export function ProfileMenu({
  username,
  myColor,
  isAdmin,
  open,
  onToggle,
  onClose,
  onLogout,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initial = (username.trim().charAt(0) || "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  return (
    <div className="profile-menu-wrap" ref={wrapperRef}>
      <button
        type="button"
        className={`profile-button ${open ? "open" : ""}`}
        onClick={onToggle}
        title="Tu perfil"
        aria-label="Abrir menú de perfil"
        aria-expanded={open}
      >
        <span
          className="profile-avatar"
          style={{ background: myColor }}
          aria-hidden="true"
        >
          {initial}
        </span>
      </button>

      {open && (
        <div className="profile-menu" role="menu">
          <div className="profile-menu-header">
            <span
              className="profile-menu-avatar"
              style={{ background: myColor }}
              aria-hidden="true"
            >
              {initial}
            </span>
            <div className="profile-menu-info">
              <span className="profile-menu-name" style={{ color: myColor }}>
                {username}
              </span>
              <span className="profile-menu-label">
                {isAdmin ? "Sesión de administrador" : "Sesión activa"}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="profile-menu-logout"
            role="menuitem"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            <span className="profile-menu-logout-icon" aria-hidden="true">
              ⎋
            </span>
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
