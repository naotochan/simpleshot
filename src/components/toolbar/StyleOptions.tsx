import type { ArrowStyle, Tool } from "../../types/annotation";
import {
  UniformArrowIcon,
  TaperedArrowIcon,
  ShapeOutlineIcon,
  ShapeFilledIcon,
} from "./icons";
import { BTN_DEFAULT, BTN_SELECTED } from "./styles";
import { useLocalization } from "../../lib/localization";

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
  const { t } = useLocalization();

  if (tool === "arrow") {
    return (
      <div className="tool-group">
        <button
          title={t("Uniform stroke", "均一な太さ")}
          aria-label={t("Uniform stroke", "均一な太さ")}
          onClick={() => onArrowStyleChange("uniform")}
          className={arrowStyle === "uniform" ? BTN_SELECTED : BTN_DEFAULT}
        >
          <UniformArrowIcon />
        </button>
        <button
          title={t("Tapered", "テーパー")}
          aria-label={t("Tapered", "テーパー")}
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
          title={t("Outline", "枠線のみ")}
          aria-label={t("Outline", "枠線のみ")}
          onClick={() => onShapeFilledChange(false)}
          className={!shapeFilled ? BTN_SELECTED : BTN_DEFAULT}
        >
          <ShapeOutlineIcon />
        </button>
        <button
          title={t("Filled", "塗りつぶし")}
          aria-label={t("Filled", "塗りつぶし")}
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
          {t("Apply", "適用")}
        </button>
        <button
          onClick={onCropCancel}
          className="h-8 px-3 rounded-lg text-xs font-medium text-tb-text-sub hover:bg-tb-hover transition-all duration-150"
        >
          {t("Cancel", "キャンセル")}
        </button>
      </div>
    );
  }

  return null;
}
