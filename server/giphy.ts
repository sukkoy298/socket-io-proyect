try {
  process.loadEnvFile();
} catch {
  // El archivo .env es opcional; sin él la API solo fallará si no hay GIPHY_API_KEY
}

const API_KEY = process.env.GIPHY_API_KEY ?? "";
const SEARCH_URL = "https://api.giphy.com/v1/gifs/search";
const LIMIT = 24;
const CACHE_TTL = 5 * 60 * 1000;

export type Sticker = {
  id: string;
  preview: string;
  full: string;
};

const cache = new Map<string, { at: number; stickers: Sticker[] }>();

export async function getStickers(expression: string): Promise<Sticker[]> {
  const cached = cache.get(expression);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.stickers;

  if (!API_KEY) {
    throw new Error(
      "GIPHY_API_KEY no está configurada. Creá un archivo .env en la raíz con tu clave de Giphy.",
    );
  }

  const url = new URL(SEARCH_URL);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("q", expression);
  url.searchParams.set("limit", String(LIMIT));
  url.searchParams.set("rating", "g");
  url.searchParams.set("lang", "es");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Giphy respondió ${res.status}`);
  const body = (await res.json()) as { data: GiphyGif[] };

  const stickers: Sticker[] = body.data.flatMap((gif) => {
    const preview = gif.images?.preview_gif?.url;
    const full = gif.images?.fixed_height?.url;
    if (!preview || !full) return [];
    return [{ id: String(gif.id), preview, full }];
  });

  cache.set(expression, { at: Date.now(), stickers });
  return stickers;
}

type GiphyGif = {
  id: string;
  images: {
    preview_gif?: { url: string };
    fixed_height?: { url: string };
  };
};
