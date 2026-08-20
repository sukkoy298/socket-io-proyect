import { useState } from "react";
import { ColorPicker } from "./ColorPicker";
import {
  MIN_USERNAME_LENGTH,
  MAX_USERNAME_LENGTH,
  REPEATED_SEQUENTIAL_REGEX,
} from "../../constants/colors";

type Props = {
  selectedColor: string;
  availableColors: string[];
  takenColors: string[];
  joinError: string | null;
  onSelectColor: (color: string) => void;
  onClearError: () => void;
  onJoin: (username: string, color: string) => void;
};

export function JoinScreen({
  selectedColor,
  availableColors,
  takenColors,
  joinError,
  onSelectColor,
  onClearError,
  onJoin,
}: Props) {
  const [nameInput, setNameInput] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  const cleanName = nameInput.trim();
  const isUnderMin = cleanName.length > 0 && cleanName.length < MIN_USERNAME_LENGTH;
  const hasRepeated = REPEATED_SEQUENTIAL_REGEX.test(cleanName);

  const validate = (): string | null => {
    if (cleanName.length < MIN_USERNAME_LENGTH) {
      return `El nombre debe tener estrictamente un mínimo de ${MIN_USERNAME_LENGTH} caracteres.`;
    }
    if (cleanName.length > MAX_USERNAME_LENGTH) {
      return `El nombre no puede tener más de ${MAX_USERNAME_LENGTH} caracteres.`;
    }
    if (REPEATED_SEQUENTIAL_REGEX.test(cleanName)) {
      return "No se permiten caracteres idénticos repetidos secuencialmente (ej. aaaaaaa o ttttttt).";
    }
    if (selectedColor && takenColors.includes(selectedColor)) {
      return "El color seleccionado ya está en uso por un usuario activo.";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);
    onClearError();

    const validationError = validate();
    if (validationError) {
      setClientError(validationError);
      return;
    }

    onJoin(cleanName, selectedColor);
  };

  const displayedError = clientError || joinError;

  return (
    <main className="join">
      <form className="join-card" onSubmit={handleSubmit}>
        <h1>Chat Grupal</h1>
        <p className="join-hint">
          Ingresa tu nombre (mínimo 8 caracteres) y selecciona tu color activo.
        </p>

        <div className="join-input-group">
          <input
            className="join-input"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              setClientError(null);
              onClearError();
            }}
            placeholder="Tu nombre (mínimo 8 caracteres)"
            maxLength={MAX_USERNAME_LENGTH}
            autoFocus
          />
          <div
            className={`join-input-hint ${
              isUnderMin || hasRepeated ? "error" : ""
            }`}
          >
            <span>
              {hasRepeated
                ? "⚠️ Caracteres repetidos secuencialmente no permitidos"
                : isUnderMin
                ? "⚠️ Mínimo 8 caracteres requeridos"
                : `${cleanName.length}/${MAX_USERNAME_LENGTH} caracteres`}
            </span>
            <span>Min. 8</span>
          </div>
        </div>

        <ColorPicker
          selectedColor={selectedColor}
          availableColors={availableColors}
          takenColors={takenColors}
          onSelectColor={(color) => {
            onSelectColor(color);
            setClientError(null);
            onClearError();
          }}
        />

        {displayedError && <div className="join-error-msg">{displayedError}</div>}

        <button
          className="join-button"
          type="submit"
          disabled={cleanName.length < MIN_USERNAME_LENGTH || hasRepeated || !selectedColor}
        >
          Entrar al chat
        </button>
      </form>
    </main>
  );
}
