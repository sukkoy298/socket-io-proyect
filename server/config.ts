export const ALLOWED_PALETTE = [
  "#ffb454",
  "#8fb7ff",
  "#ff8fa3",
  "#57d38c",
  "#c792ff",
  "#7fdbe8",
  "#f78fc1",
  "#e8d44d",
] as const;

export type PaletteColor = (typeof ALLOWED_PALETTE)[number];

export const MIN_USERNAME_LENGTH = 5;
export const MAX_USERNAME_LENGTH = 25;

// Regex to block characters sequentially repeated (e.g., aaaaaaa, ttttttt)
export const REPEATED_SEQUENTIAL_REGEX = /(.)\1{2,}/i;

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
export const DEFAULT_ROOM = "general";

export function checkAdminPassword(
  rawName: string,
  password?: string,
): { ok: boolean; isAdmin: boolean; error?: string } {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    return { ok: true, isAdmin: false };
  }
  const clean = String(rawName ?? "").trim();
  if (clean.toLowerCase() !== ADMIN_USERNAME.toLowerCase()) {
    return { ok: true, isAdmin: false };
  }
  if (!password || String(password) !== ADMIN_PASSWORD) {
    return {
      ok: false,
      isAdmin: true,
      error: "Contraseña de administrador requerida o incorrecta.",
    };
  }
  return { ok: true, isAdmin: true };
}

export const MIN_ROOM_NAME_LENGTH = 3;
export const MAX_ROOM_NAME_LENGTH = 24;
export const ROOM_NAME_REGEX = /^[\p{L}\p{N}][\p{L}\p{N} _-]*$/u;

export function validateRoomName(rawName: string): {
  valid: boolean;
  error?: string;
  cleanName: string;
} {
  const cleanName = String(rawName ?? "").trim().replace(/\s+/g, " ");
  if (cleanName.length < MIN_ROOM_NAME_LENGTH) {
    return {
      valid: false,
      error: `El nombre de la sala debe tener al menos ${MIN_ROOM_NAME_LENGTH} caracteres.`,
      cleanName,
    };
  }
  if (cleanName.length > MAX_ROOM_NAME_LENGTH) {
    return {
      valid: false,
      error: `El nombre de la sala no puede exceder ${MAX_ROOM_NAME_LENGTH} caracteres.`,
      cleanName,
    };
  }
  if (!ROOM_NAME_REGEX.test(cleanName)) {
    return {
      valid: false,
      error: "El nombre de la sala solo puede contener letras, números, espacios y guiones.",
      cleanName,
    };
  }
  return { valid: true, cleanName };
}

export function validateUsernameFormat(rawName: string): { valid: boolean; error?: string; cleanName: string } {
  const cleanName = String(rawName ?? "").trim();
  if (cleanName.length < MIN_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `El nombre de usuario debe tener un mínimo estricto de ${MIN_USERNAME_LENGTH} caracteres.`,
      cleanName,
    };
  }
  if (cleanName.length > MAX_USERNAME_LENGTH) {
    return {
      valid: false,
      error: `El nombre de usuario no puede exceder ${MAX_USERNAME_LENGTH} caracteres.`,
      cleanName,
    };
  }
  if (REPEATED_SEQUENTIAL_REGEX.test(cleanName)) {
    return {
      valid: false,
      error: "El nombre de usuario no puede contener caracteres idénticos repetidos secuencialmente (por ejemplo, aaaaa o ttttt).",
      cleanName,
    };
  }
  return { valid: true, cleanName };
}
