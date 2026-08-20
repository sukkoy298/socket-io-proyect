import { useEffect, useState } from "react";
import {
  STICKER_CATEGORY_MAP,
  SPANISH_TO_ENGLISH_MAP,
  type Sticker,
} from "./stickers";

type Props = {
  onClose: () => void;
  onPick: (sticker: Sticker) => void;
};

export function StickerPicker({ onClose, onPick }: Props) {
  const [selectedCategory, setSelectedCategory] = useState(STICKER_CATEGORY_MAP[0]);
  const [query, setQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState<string | null>(null);
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

  const loading = results.displayTitle !== displayTitle;
  const stickers = results.displayTitle === displayTitle ? results.stickers : [];
  const error = results.displayTitle === displayTitle && results.error;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(query.trim() || null);
  };

  const clearSearch = () => {
    setQuery("");
    setActiveSearch(null);
  };

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

        <div className="sticker-tabs" role="tablist">
          {STICKER_CATEGORY_MAP.map((category) => {
            const isSelected = !activeSearch && category.label === selectedCategory.label;
            return (
              <button
                key={category.label}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`sticker-tab shrink-0 ${isSelected ? "active" : ""}`}
                onClick={() => {
                  setSelectedCategory(category);
                  setActiveSearch(null);
                }}
              >
                {category.label}
              </button>
            );
          })}
        </div>

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
                <button
                  key={sticker.id}
                  type="button"
                  className="sticker-cell"
                  onClick={() => onPick(sticker)}
                >
                  <img
                    src={sticker.preview}
                    alt={`Sticker de ${displayTitle.toLowerCase()}`}
                    loading="lazy"
                    decoding="async"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
