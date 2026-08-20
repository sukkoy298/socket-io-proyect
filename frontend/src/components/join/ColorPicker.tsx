import { PALETTE } from "../../constants/colors";

type Props = {
  selectedColor: string;
  availableColors: string[];
  takenColors: string[];
  onSelectColor: (color: string) => void;
};

export function ColorPicker({
  selectedColor,
  availableColors,
  takenColors,
  onSelectColor,
}: Props) {
  return (
    <div className="color-picker-section">
      <div className="color-picker-label">
        <span>Color de tu usuario</span>
        <span>{availableColors.length} disponibles</span>
      </div>
      <div className="color-palette-grid">
        {PALETTE.map((color) => {
          const isTaken = takenColors.includes(color);
          const isSelected = selectedColor === color;
          return (
            <button
              key={color}
              type="button"
              title={
                isTaken
                  ? "Color ocupado por otro usuario activo"
                  : "Color disponible"
              }
              className={`color-swatch-btn ${isSelected ? "selected" : ""} ${
                isTaken ? "taken" : ""
              }`}
              style={{ backgroundColor: color }}
              onClick={() => {
                if (!isTaken) {
                  onSelectColor(color);
                }
              }}
              disabled={isTaken}
            />
          );
        })}
      </div>
    </div>
  );
}
