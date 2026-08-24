import { useEffect, useMemo, useState } from "react";
import {
  STICKER_CATEGORY_MAP,
  SPANISH_TO_ENGLISH_MAP,
  type Sticker,
  type StickerCategory,
} from "./stickers";

const FAVORITES_STORAGE_KEY = "chat.sticker-favorites";

function loadFavorites(): Sticker[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter(
          (s): s is Sticker =>
            s && typeof s.id === "string" && typeof s.preview === "string"
        )
      : [];
  } catch {
    return [];
  }
}

type Props = {
  onClose: () => void;
  onPick: (sticker: Sticker) => void;
};

type Panel = "favorites" | "category";

function StickerCell({
  sticker,
  alt,
  isFavorite,
  onPick,
  onToggleFavorite,
}: {
  sticker: Sticker;
  alt: string;
  isFavorite: boolean;
  onPick: (sticker: Sticker) => void;
  onToggleFavorite: (sticker: Sticker) => void;
}) {
  return (
    <div className="sticker-cell-wrap">
      <button
        type="button"
        className="sticker-cell"
        onClick={() => onPick(sticker)}
        aria-label={`Enviar sticker de ${alt.toLowerCase()}`}
      >
        <img
          src={sticker.preview}
          alt={`Sticker de ${alt.toLowerCase()}`}
          loading="lazy"
          decoding="async"
        />
      </button>
      <button
        type="button"
        className={`sticker-fav ${isFavorite ? "active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(sticker);
        }}
        aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
        aria-pressed={isFavorite}
        title={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
      >
        ♥
      </button>
    </div>
  );
}

export function StickerPicker({ onClose, onPick }: Props) {
  const [selectedCategory, setSelectedCategory] = useState(STICKER_CATEGORY_MAP[0]);
  const [query, setQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("category");
  const [favorites, setFavorites] = useState<Sticker[]>(loadFavorites);
  const [results, setResults] = useState<{
    displayTitle: string;
    stickers: Sticker[];
    error: boolean;
  }>({
    displayTitle: STICKER_CATEGORY_MAP[0].label,
    stickers: [],
    error: false,
  });

  // Calculate English expression to send to Giphy
  let englishExpression: string;
  let displayTitle: string;

  if (activeSearch) {
    displayTitle = activeSearch;
    const lower = activeSearch.toLowerCase().trim();
    englishExpression = SPANISH_TO_ENGLISH_MAP[lower] || activeSearch;
  } else {
    displayTitle = selectedCategory.label;
    englishExpression = selectedCategory.query;
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stickers?expression=${encodeURIComponent(englishExpression)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { stickers: Sticker[] }) => {
        if (!cancelled) {
          setResults({
            displayTitle,
            stickers: data.stickers ?? [],
            error: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults({ displayTitle, stickers: [], error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [englishExpression, displayTitle]);

  // Persist favorites across sessions and picker reopenings.
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // Ignore storage failures (e.g. private mode).
    }
  }, [favorites]);

  const loading = results.displayTitle !== displayTitle;
  const stickers = results.displayTitle === displayTitle ? results.stickers : [];
  const error = results.displayTitle === displayTitle && results.error;

  const favoriteIds = useMemo(
    () => new Set(favorites.map((fav) => fav.id)),
    [favorites]
  );

  const toggleFavorite = (sticker: Sticker) => {
    setFavorites((prev) => {
      if (prev.some((fav) => fav.id === sticker.id)) {
        return prev.filter((fav) => fav.id !== sticker.id);
      }
      return [...prev, sticker];
    });
  };

  const pickCategory = (category: StickerCategory) => {
    setSelectedCategory(category);
    setActiveSearch(null);
    setPanel("category");
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(query.trim() || null);
    setPanel("category");
  };

  const clearSearch = () => {
    setQuery("");
    setActiveSearch(null);
    setPanel("category");
  };

  const showFavorites = panel === "favorites";

  return (
    <div className="sticker-picker-wrap">
      <div className="sticker-backdrop" onClick={onClose} />
      <div className="sticker-picker" role="dialog" aria-label="Selector de stickers">
        <form className="sticker-search" onSubmit={submitSearch}>
          <input
            className="sticker-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar stickers..."
            maxLength={30}
            aria-label="Buscar stickers"
          />
          {activeSearch ? (
            <button
              type="button"
              className="sticker-search-clear"
              onClick={clearSearch}
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          ) : (
            <button type="submit" className="sticker-search-submit">
              Buscar
            </button>
          )}
        </form>

        {showFavorites ? (
          <div className="sticker-body">
            {favorites.length === 0 ? (
              <p className="sticker-note">
                Todavía no tienes favoritos. Toca el ♥ de un sticker para guardarlo aquí.
              </p>
            ) : (
              <div className="sticker-grid">
                {favorites.map((sticker) => (
                  <StickerCell
                    key={sticker.id}
                    sticker={sticker}
                    alt="favorito"
                    isFavorite
                    onPick={onPick}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="sticker-body">
            {loading ? (
              <p className="sticker-note">Buscando stickers...</p>
            ) : error ? (
              <p className="sticker-note sticker-error">
                No se pudieron cargar los stickers. ¿Está configurada la clave de Giphy?
              </p>
            ) : stickers.length === 0 ? (
              <p className="sticker-note">Sin resultados para {displayTitle}.</p>
            ) : (
              <div className="sticker-grid">
                {stickers.map((sticker) => (
                  <StickerCell
                    key={sticker.id}
                    sticker={sticker}
                    alt={displayTitle}
                    isFavorite={favoriteIds.has(sticker.id)}
                    onPick={onPick}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="sticker-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={showFavorites}
            className={`sticker-tab shrink-0 ${showFavorites ? "active" : ""}`}
            onClick={() => setPanel("favorites")}
          >
            Favoritos
            {favorites.length > 0 && (
              <span className="sticker-tab-count">{favorites.length}</span>
            )}
          </button>
          {STICKER_CATEGORY_MAP.map((category) => {
            const isSelected =
              !showFavorites && !activeSearch && category.label === selectedCategory.label;
            return (
              <button
                key={category.label}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`sticker-tab shrink-0 ${isSelected ? "active" : ""}`}
                onClick={() => pickCategory(category)}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
