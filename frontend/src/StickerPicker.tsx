import { useEffect, useState } from "react";
import {
  STICKER_CATEGORIES,
  type Sticker,
  type StickerCategory,
} from "./stickers";

export function SmileyIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

type Props = {
  onClose: () => void;
  onPick: (sticker: Sticker) => void;
};

export function StickerPicker({ onClose, onPick }: Props) {
  const [tab, setTab] = useState<StickerCategory>(STICKER_CATEGORIES[0]);
  const [results, setResults] = useState<{
    tab: StickerCategory;
    stickers: Sticker[];
    error: boolean;
  }>({ tab: STICKER_CATEGORIES[0], stickers: [], error: false });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/stickers?expression=${encodeURIComponent(tab)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: { stickers: Sticker[] }) => {
        if (!cancelled) setResults({ tab, stickers: data.stickers, error: false });
      })
      .catch(() => {
        if (!cancelled) setResults({ tab, stickers: [], error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const loading = results.tab !== tab;
  const stickers = results.tab === tab ? results.stickers : [];
  const error = results.tab === tab && results.error;

  return (
    <div className="sticker-picker-wrap">
      <div className="sticker-backdrop" onClick={onClose} />
      <div className="sticker-picker" role="dialog" aria-label="Selector de stickers">
        <div className="sticker-tabs" role="tablist">
          {STICKER_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={category === tab}
              className={`sticker-tab ${category === tab ? "active" : ""}`}
              onClick={() => setTab(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="sticker-body">
          {loading ? (
            <p className="sticker-note">Buscando stickers...</p>
          ) : error ? (
            <p className="sticker-note sticker-error">
              No se pudieron cargar los stickers. ¿Está configurada la clave de
              Giphy?
            </p>
          ) : stickers.length === 0 ? (
            <p className="sticker-note">Sin resultados para {tab}.</p>
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
                    alt={`Sticker de ${tab.toLowerCase()}`}
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
