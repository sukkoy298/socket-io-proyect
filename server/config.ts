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

export const MIN_USERNAME_LENGTH = 8;
export const MAX_USERNAME_LENGTH = 25;

// Regex to block characters sequentially repeated (e.g., aaaaaaa, ttttttt)
export const REPEATED_SEQUENTIAL_REGEX = /(.)\1{2,}/i;

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
