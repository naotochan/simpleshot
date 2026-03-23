import { memo, type ReactNode } from "react";

export type Tool =
  | "arrow"
  | "text"
  | "rect"
  | "ellipse"
  | "pen"
  | "highlighter"
  | "mosaic"
  | "crop"
  | "hand";

export type AnnotationColor = string;
export type ArrowStyle = "uniform" | "tapered";

const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="19" x2="19" y2="5" />
    <polyline points="10,5 19,5 19,14" />
  </svg>
);

const TextIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 4v3h5.5v12h3V7H19V4z" />
  </svg>
);

const RectIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="5" width="18" height="14" rx="1" />
  </svg>
);

const EllipseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="12" rx="9" ry="6" />
  </svg>
);

const HighlighterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="2" y="8" width="20" height="8" rx="1" />
  </svg>
);

const MosaicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
    <rect x="0" y="0" width="4" height="4" />
    <rect x="8" y="0" width="4" height="4" />
    <rect x="4" y="4" width="4" height="4" />
    <rect x="12" y="4" width="4" height="4" />
    <rect x="0" y="8" width="4" height="4" />
    <rect x="8" y="8" width="4" height="4" />
    <rect x="4" y="12" width="4" height="4" />
    <rect x="12" y="12" width="4" height="4" />
  </svg>
);

const PencilIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.71 7.04c.39-.39.39-1.04 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.84 1.83 3.75 3.75M3 17.25V21h3.75L17.81 9.93l-3.75-3.75L3 17.25z" />
  </svg>
);

const HandIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M23 5.5V20c0 2.2-1.8 4-4 4h-7.3c-1.08 0-2.1-.43-2.85-1.19L1 14.83s1.26-1.23 1.3-1.25c.22-.19.49-.29.79-.29.22 0 .42.06.6.16.04.01 4.31 2.46 4.31 2.46V4c0-.83.67-1.5 1.5-1.5S11 3.17 11 4v7h1V1.5c0-.83.67-1.5 1.5-1.5S15 .67 15 1.5V11h1V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5z" />
  </svg>
);

const CropIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17 15h2V7c0-1.1-.9-2-2-2H9v2h8v8zM7 17V1H5v4H1v2h4v10c0 1.1.9 2 2 2h10v4h2v-4h4v-2H7z" />
  </svg>
);

const UniformArrowIcon = () => (
  <svg width="20" height="12" viewBox="0 0 24 12" fill="currentColor">
    <rect x="0" y="4" width="17" height="4" />
    <polygon points="15,0 24,6 15,12" />
  </svg>
);

const TaperedArrowIcon = () => (
  <svg width="20" height="12" viewBox="0 0 24 12" fill="currentColor">
    <path d="M0 6 L15 4 L15 0 L24 6 L15 12 L15 8 Z" />
  </svg>
);

const ShapeOutlineIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="5" width="18" height="14" rx="1" />
  </svg>
);

const ShapeFilledIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="5" width="18" height="14" rx="1" />
  </svg>
);

const EyedropperIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.41-1.42-1.42 1.42 1.41 1.41-6.6 6.6A2 2 0 0 0 5 16v3h3a2 2 0 0 0 1.42-.59l6.6-6.6 1.41 1.42 1.42-1.42-1.41-1.41 3.12-3.12a1 1 0 0 0 0-1.41zM7 17l-2-2 .6-.6 2 2z" />
  </svg>
);

const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
  </svg>
);

const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
  </svg>
);

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: "arrow", label: "矢印", icon: <ArrowIcon /> },
  { id: "text", label: "テキスト", icon: <TextIcon /> },
  { id: "rect", label: "矩形", icon: <RectIcon /> },
  { id: "ellipse", label: "楕円", icon: <EllipseIcon /> },
  { id: "pen", label: "ペン", icon: <PencilIcon /> },
  { id: "highlighter", label: "ハイライト", icon: <HighlighterIcon /> },
  { id: "mosaic", label: "モザイク", icon: <MosaicIcon /> },
  { id: "crop", label: "トリミング", icon: <CropIcon /> },
  { id: "hand", label: "手のひら", icon: <HandIcon /> },
];

const PADDING_OPTIONS = [0, 20, 40, 60, 80];

interface ToolbarProps {
  currentTool: Tool;
  currentColor: AnnotationColor;
  currentSize: number;
  currentArrowStyle: ArrowStyle;
  shapeFilled: boolean;
  bgEnabled: boolean;
  bgColor: string;
  bgPadding: number;
  canUndo: boolean;
  canRedo: boolean;
  hasCropRegion: boolean;
  favoriteColors: string[];
  isPickingColor: boolean;
  onToolChange: (t: Tool) => void;
  onColorChange: (c: AnnotationColor) => void;
  onSizeChange: (s: number) => void;
  onArrowStyleChange: (s: ArrowStyle) => void;
  onShapeFilledChange: (v: boolean) => void;
  onBgEnabledChange: (v: boolean) => void;
  onBgColorChange: (c: string) => void;
  onBgPaddingChange: (p: number) => void;
  cornerRadius: number;
  onCornerRadiusChange: (r: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onSave: () => void;
  onCropApply: () => void;
  onCropCancel: () => void;
  canCropRevert: boolean;
  onCropRevert: () => void;
  onAddFavoriteColor: () => void;
  onRemoveFavoriteColor: (index: number) => void;
  onEyedrop: () => void;
}

const Toolbar = memo(function Toolbar({
  currentTool,
  currentColor,
  currentSize,
  currentArrowStyle,
  shapeFilled,
  bgEnabled,
  bgColor,
  bgPadding,
  canUndo,
  canRedo,
  hasCropRegion,
  favoriteColors,
  isPickingColor,
  onToolChange,
  onColorChange,
  onSizeChange,
  onArrowStyleChange,
  onShapeFilledChange,
  onBgEnabledChange,
  onBgColorChange,
  onBgPaddingChange,
  cornerRadius,
  onCornerRadiusChange,
  onUndo,
  onRedo,
  onCopy,
  onSave,
  onCropApply,
  onCropCancel,
  canCropRevert,
  onCropRevert,
  onAddFavoriteColor,
  onRemoveFavoriteColor,
  onEyedrop,
}: ToolbarProps) {
  return (
    <div className="bg-gray-900 border-b border-gray-700 select-none">
      {/* メインツールバー */}
      <div className="flex items-center gap-1 px-3 py-2">
        {/* ツール選択 */}
        {TOOLS.map((t) => (
          <button
            key={t.id}
            title={t.label}
            onClick={() => onToolChange(t.id)}
            className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors ${
              currentTool === t.id
                ? "bg-blue-600 text-white"
                : "text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t.icon}
          </button>
        ))}

        {/* 矢印スタイル（矢印ツール選択時のみ） */}
        {currentTool === "arrow" && (
          <>
            <div className="w-px h-6 bg-gray-600 mx-1" />
            <button
              title="均一な太さ"
              onClick={() => onArrowStyleChange("uniform")}
              className={`px-2 h-8 rounded flex items-center justify-center transition-colors ${
                currentArrowStyle === "uniform"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <UniformArrowIcon />
            </button>
            <button
              title="テーパー（先端に向かって太くなる）"
              onClick={() => onArrowStyleChange("tapered")}
              className={`px-2 h-8 rounded flex items-center justify-center transition-colors ${
                currentArrowStyle === "tapered"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <TaperedArrowIcon />
            </button>
          </>
        )}

        {/* 図形スタイル（矩形・楕円ツール選択時） */}
        {(currentTool === "rect" || currentTool === "ellipse") && (
          <>
            <div className="w-px h-6 bg-gray-600 mx-1" />
            <button
              title="枠線のみ"
              onClick={() => onShapeFilledChange(false)}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                !shapeFilled
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <ShapeOutlineIcon />
            </button>
            <button
              title="塗りつぶし"
              onClick={() => onShapeFilledChange(true)}
              className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                shapeFilled
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <ShapeFilledIcon />
            </button>
          </>
        )}

        {/* トリミング操作（cropツール選択時） */}
        {currentTool === "crop" && (
          <>
            <div className="w-px h-6 bg-gray-600 mx-1" />
            <button
              disabled={!hasCropRegion}
              onClick={onCropApply}
              className="px-2 h-8 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-500 transition-colors disabled:opacity-30"
            >
              適用
            </button>
            <button
              onClick={onCropCancel}
              className="px-2 h-8 rounded text-xs font-medium text-gray-300 hover:bg-gray-700 transition-colors"
            >
              キャンセル
            </button>
          </>
        )}

        <div className="w-px h-6 bg-gray-600 mx-1" />

        {/* カラーピッカー */}
        <label
          className="relative w-6 h-6 rounded-full border-2 border-gray-500 cursor-pointer overflow-hidden hover:border-gray-300 transition-colors flex-shrink-0"
          title="色を選択"
          style={{ backgroundColor: currentColor }}
        >
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onColorChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>

        {/* スポイト */}
        <button
          title="スポイト（色を拾う）"
          onClick={onEyedrop}
          className={`w-6 h-6 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
            isPickingColor
              ? "bg-blue-600 text-white"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
          }`}
        >
          <EyedropperIcon />
        </button>

        {/* お気に入り色スウォッチ */}
        {favoriteColors.map((color, i) => (
          <button
            key={i}
            title={`${color}（右クリックで削除）`}
            style={{ backgroundColor: color }}
            className="w-5 h-5 rounded-full border-2 border-gray-600 hover:border-gray-300 transition-colors flex-shrink-0"
            onClick={() => onColorChange(color)}
            onContextMenu={(e) => { e.preventDefault(); onRemoveFavoriteColor(i); }}
          />
        ))}
        <button
          title={
            favoriteColors.length >= 8
              ? "スロットが満杯です（右クリックで削除）"
              : favoriteColors.includes(currentColor)
              ? "この色は登録済みです"
              : "現在の色をお気に入りに追加"
          }
          disabled={favoriteColors.length >= 8 || favoriteColors.includes(currentColor)}
          onClick={onAddFavoriteColor}
          className="w-5 h-5 rounded-full border border-dashed border-gray-500 text-gray-400 hover:border-gray-300 hover:text-gray-200 flex items-center justify-center text-xs leading-none transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
        >
          +
        </button>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        {/* サイズスライダー + 数値入力 */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">太さ</span>
          <input
            type="range"
            min={1}
            max={20}
            value={currentSize}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="w-32 accent-blue-500"
          />
          <input
            type="number"
            min={1}
            max={20}
            value={currentSize}
            onChange={(e) => {
              const v = Math.max(1, Math.min(20, Number(e.target.value) || 1));
              onSizeChange(v);
            }}
            className="w-10 bg-gray-800 text-gray-300 text-xs text-center rounded border border-gray-600 px-1 py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </div>

        <div className="w-px h-6 bg-gray-600 mx-1" />

        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700 disabled:opacity-30"
          title="元に戻す (⌘Z)"
        >
          <UndoIcon />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="w-8 h-8 rounded flex items-center justify-center text-gray-300 hover:bg-gray-700 disabled:opacity-30"
          title="やり直し (⌘⇧Z)"
        >
          <RedoIcon />
        </button>

        {/* トリミング復元 */}
        {canCropRevert && (
          <button
            onClick={onCropRevert}
            className="px-2 py-1 rounded text-xs text-orange-300 hover:bg-gray-700 transition-colors"
            title="トリミングを元に戻す"
          >
            トリミング復元
          </button>
        )}

        {/* 右側のアクション */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={onCopy}
            className="px-3 py-1.5 rounded text-sm text-gray-200 bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            コピー
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded text-sm text-white bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            保存
          </button>
        </div>
      </div>

      {/* 背景セクション */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-gray-800">
        <span className="text-gray-500 text-xs shrink-0">背景</span>

        {/* 背景 ON/OFF */}
        <button
          onClick={() => onBgEnabledChange(!bgEnabled)}
          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
            bgEnabled
              ? "bg-blue-600 text-white"
              : "text-gray-400 bg-gray-700 hover:bg-gray-600"
          }`}
        >
          {bgEnabled ? "ON" : "OFF"}
        </button>

        {bgEnabled && (
          <>
            {/* 背景色ピッカー */}
            <label
              className="relative w-5 h-5 rounded-full border-2 border-gray-500 cursor-pointer overflow-hidden hover:border-gray-300 transition-colors"
              title="背景色を選択"
              style={{ backgroundColor: bgColor }}
            >
              <input
                type="color"
                value={bgColor}
                onChange={(e) => onBgColorChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>

            <div className="w-px h-4 bg-gray-700 mx-1" />

            {/* パディング選択 */}
            <span className="text-gray-500 text-xs">余白</span>
            <div className="flex gap-1">
              {PADDING_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => onBgPaddingChange(p)}
                  className={`px-1.5 py-0.5 rounded text-xs transition-colors ${
                    bgPadding === p
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  {p === 0 ? "なし" : `${p}`}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="w-px h-4 bg-gray-700 mx-1" />

        {/* 角丸 */}
        <span className="text-gray-500 text-xs">角丸</span>
        <input
          type="range"
          min={0}
          max={60}
          value={cornerRadius}
          onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
          className="w-20 accent-blue-500"
        />
        <span className="text-gray-400 text-xs w-6 text-right">{cornerRadius}</span>
      </div>
    </div>
  );
});

export default Toolbar;
