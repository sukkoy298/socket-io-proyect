import type { StickerCategory } from "../../types/stickers";

export const STICKER_CATEGORY_MAP: StickerCategory[] = [
  { label: "Feliz", query: "happy" },
  { label: "Triste", query: "sad" },
  { label: "Enojo", query: "angry" },
  { label: "Sorprendido", query: "surprised" },
  { label: "Amor", query: "love" },
  { label: "Gracioso", query: "funny" },
  { label: "Bailando", query: "dancing" },
  { label: "Genial", query: "cool" },
];

export const SPANISH_TO_ENGLISH_MAP: Record<string, string> = {
  feliz: "happy",
  triste: "sad",
  enojo: "angry",
  enojado: "angry",
  sorprendido: "surprised",
  amor: "love",
  gracioso: "funny",
  bailando: "dancing",
  genial: "cool",
};

export type { Sticker, StickerCategory } from "../../types/stickers";
