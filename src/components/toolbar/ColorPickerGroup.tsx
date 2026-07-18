import type { AnnotationColor } from "../../types/annotation";
import { EyedropperIcon } from "./icons";
import { BTN_DEFAULT, BTN_SELECTED } from "./styles";

interface ColorPickerGroupProps {
  color: AnnotationColor;
  favorites: string[];
  isPicking: boolean;
  onColorChange: (c: AnnotationColor) => void;
  onEyedrop: () => void;
  onAddFavorite: () => void;
  onRemoveFavorite: (index: number) => void;
}

export function ColorPickerGroup({
  color,
  favorites,
  isPicking,
  onColorChange,
  onEyedrop,
  onAddFavorite,
  onRemoveFavorite,
}: ColorPickerGroupProps) {
  return (
    <div className="tool-group">
      <label
        className="relative w-7 h-7 rounded-full cursor-pointer flex-shrink-0 ring-2 ring-tb-border hover:ring-tb-active transition-all"
        title="色を選択"
        style={{ backgroundColor: color }}
      >
        <input
          type="color"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>

      <button
        title="スポイト"
        onClick={onEyedrop}
        className={isPicking ? BTN_SELECTED : BTN_DEFAULT}
      >
        <EyedropperIcon />
      </button>

      {favorites.map((fav, i) => (
        <button
          key={i}
          title={`${fav}（右クリックで削除）`}
          style={{ backgroundColor: fav }}
          className="w-6 h-6 rounded-full flex-shrink-0 ring-2 ring-transparent hover:ring-tb-active transition-all"
          onClick={() => onColorChange(fav)}
          onContextMenu={(e) => {
            e.preventDefault();
            onRemoveFavorite(i);
          }}
        />
      ))}
      <button
        title={
          favorites.length >= 8
            ? "スロットが満杯です"
            : favorites.includes(color)
            ? "登録済み"
            : "お気に入りに追加"
        }
        disabled={favorites.length >= 8 || favorites.includes(color)}
        onClick={onAddFavorite}
        className="w-6 h-6 rounded-full border border-dashed border-tb-border text-tb-text-dim hover:border-tb-active hover:text-tb-text-sub flex items-center justify-center text-xs leading-none transition-all disabled:opacity-20 disabled:cursor-not-allowed flex-shrink-0"
      >
        +
      </button>
    </div>
  );
}
