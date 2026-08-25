const STORAGE_KEY = "chatSession";

export type PersistedSession = {
  username: string;
  color: string;
  isAdmin: boolean;
};

function isValidSession(value: unknown): value is PersistedSession {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.username === "string" &&
    v.username.length > 0 &&
    typeof v.color === "string" &&
    v.color.length > 0 &&
    typeof v.isAdmin === "boolean"
  );
}

export function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(session: PersistedSession): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* almacenamiento no disponible (modo privado, etc.) */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin-op */
  }
}
