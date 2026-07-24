import { memo } from "react";
import type { AnnotationColor, ArrowStyle, Tool } from "../../types/annotation";
import type { BackgroundState } from "./BackgroundControls";
import { ToolSelector } from "./ToolSelector";
import { StyleOptions } from "./StyleOptions";
import { ColorPickerGroup } from "./ColorPickerGroup";
import { SizeControl } from "./SizeControl";
import { HistoryButtons } from "./HistoryButtons";
import { ActionButtons } from "./ActionButtons";
import { BackgroundControls } from "./BackgroundControls";
import { useLocalization } from "../../lib/localization";

export type { Tool, AnnotationColor, ArrowStyle } from "../../types/annotation";
export type { BackgroundState };

/* ============================================================
   Grouped prop interfaces
   ============================================================ */

export interface ToolControls {
  current: Tool;
  color: AnnotationColor;
  size: number;
  arrowStyle: ArrowStyle;
  shapeFilled: boolean;
  showSize: boolean;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: AnnotationColor) => void;
  onSizeChange: (s: number) => void;
  onArrowStyleChange: (s: ArrowStyle) => void;
  onShapeFilledChange: (v: boolean) => void;
}

export interface BackgroundControlsState extends BackgroundState {
  onEnabledChange: (v: boolean) => void;
  onColorChange: (c: string) => void;
  onPaddingChange: (p: number) => void;
}

export interface FrameControls {
  cornerRadius: number;
  onCornerRadiusChange: (r: number) => void;
}

export interface HistoryControls {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

export interface CropControls {
  hasRegion: boolean;
  canRevert: boolean;
  onApply: () => void;
  onCancel: () => void;
  onRevert: () => void;
}

export interface ColorControls {
  favorites: string[];
  isPicking: boolean;
  onAddFavorite: () => void;
  onRemoveFavorite: (index: number) => void;
  onEyedrop: () => void;
}

export interface ToolbarProps {
  tool: ToolControls;
  background: BackgroundControlsState;
  frame: FrameControls;
  history: HistoryControls;
  crop: CropControls;
  colors: ColorControls;
  onCopy: () => void;
  onSave: () => void;
}

/* ============================================================
   Component
   ============================================================ */

const Toolbar = memo(function Toolbar({
  tool,
  background,
  frame,
  history,
  crop,
  colors,
  onCopy,
  onSave,
}: ToolbarProps) {
  const { t } = useLocalization();
  return (
    <div className="bg-tb-base border-b border-tb-border select-none">
      {/* メインツールバー — 幅超過時は横スクロール */}
      <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto toolbar-scroll">
        <ToolSelector current={tool.current} onChange={tool.onToolChange} />

        <StyleOptions
          tool={tool.current}
          arrowStyle={tool.arrowStyle}
          shapeFilled={tool.shapeFilled}
          hasCropRegion={crop.hasRegion}
          onArrowStyleChange={tool.onArrowStyleChange}
          onShapeFilledChange={tool.onShapeFilledChange}
          onCropApply={crop.onApply}
          onCropCancel={crop.onCancel}
        />

        <ColorPickerGroup
          color={tool.color}
          favorites={colors.favorites}
          isPicking={colors.isPicking}
          onColorChange={tool.onColorChange}
          onEyedrop={colors.onEyedrop}
          onAddFavorite={colors.onAddFavorite}
          onRemoveFavorite={colors.onRemoveFavorite}
        />

        {tool.showSize && (
          <SizeControl
            tool={tool.current}
            size={tool.size}
            color={tool.color}
            onChange={tool.onSizeChange}
          />
        )}

        <HistoryButtons
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.onUndo}
          onRedo={history.onRedo}
        />

        {crop.canRevert && (
          <button
            onClick={crop.onRevert}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-tb-warning hover:bg-tb-warning/10 transition-all duration-150 flex-shrink-0"
            title={t("Revert crop", "トリミングを元に戻す")}
          >
            {t("Revert Crop", "トリミング復元")}
          </button>
        )}

        <ActionButtons onCopy={onCopy} onSave={onSave} />
      </div>

      <BackgroundControls
        background={background}
        cornerRadius={frame.cornerRadius}
        onEnabledChange={background.onEnabledChange}
        onColorChange={background.onColorChange}
        onPaddingChange={background.onPaddingChange}
        onCornerRadiusChange={frame.onCornerRadiusChange}
      />
    </div>
  );
});

export default Toolbar;
