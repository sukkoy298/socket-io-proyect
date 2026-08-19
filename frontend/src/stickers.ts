export const STICKER_CATEGORIES = [
  "Feliz",
  "Triste",
  "Enojado",
  "Sorprendido",
  "Amor",
  "Gracioso",
  "Bailando",
  "Genial",
] as const;

export type StickerCategory = (typeof STICKER_CATEGORIES)[number];

export type Sticker = {
  id: string;
  preview: string;
  full: string;
};
