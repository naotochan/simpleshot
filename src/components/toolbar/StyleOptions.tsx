import type { ArrowStyle, Tool } from "../../types/annotation";
import {
  UniformArrowIcon,
  TaperedArrowIcon,
  ShapeOutlineIcon,
  ShapeFilledIcon,
} from "./icons";
import { BTN_DEFAULT, BTN_SELECTED } from "./styles";

interface StyleOptionsProps {
  tool: Tool;
  arrowStyle: ArrowStyle;
  shapeFilled: boolean;
  hasCropRegion: boolean;
  onArrowStyleChange: (s: ArrowStyle) => void;
  onShapeFilledChange: (v: boolean) => void;
  onCropApply: () => void;
  onCropCancel: () => void;
}

export function StyleOptions({
  tool,
  arrowStyle,
  shapeFilled,
  hasCropRegion,
  onArrowStyleChange,
  onShapeFilledChange,
  onCropApply,
  onCropCancel,
}: StyleOptionsProps) {
  if (tool === "arrow") {
    return (
      <div className="tool-group">
        <button
          title="均一な太さ"
          onClick={() => onArrowStyleChange("uniform")}
          className={arrowStyle === "uniform" ? BTN_SELECTED : BTN_DEFAULT}
        >
          <UniformArrowIcon />
        </button>
        <button
          title="テーパー"
          onClick={() => onArrowStyleChange("tapered")}
          className={arrowStyle === "tapered" ? BTN_SELECTED : BTN_DEFAULT}
        >
          <TaperedArrowIcon />
        </button>
      </div>
    );
  }

  if (tool === "rect" || tool === "ellipse") {
    return (
      <div className="tool-group">
        <button
          title="枠線のみ"
          onClick={() => onShapeFilledChange(false)}
          className={!shapeFilled ? BTN_SELECTED : BTN_DEFAULT}
        >
          <ShapeOutlineIcon />
        </button>
        <button
          title="塗りつぶし"
          onClick={() => onShapeFilledChange(true)}
          className={shapeFilled ? BTN_SELECTED : BTN_DEFAULT}
        >
          <ShapeFilledIcon />
        </button>
      </div>
    );
  }

  if (tool === "crop") {
    return (
      <div className="tool-group">
        <button
          disabled={!hasCropRegion}
          onClick={onCropApply}
          className="h-8 px-3 rounded-lg text-xs font-semibold bg-tb-success/20 text-tb-success hover:bg-tb-success/30 transition-all duration-150 disabled:opacity-30"
        >
          適用
        </button>
        <button
          onClick={onCropCancel}
          className="h-8 px-3 rounded-lg text-xs font-medium text-tb-text-sub hover:bg-tb-hover transition-all duration-150"
        >
          キャンセル
        </button>
      </div>
    );
  }

  return null;
}
