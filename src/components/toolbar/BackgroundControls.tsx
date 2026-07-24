import { useLocalization } from "../../lib/localization";

const PADDING_OPTIONS = [0, 20, 40, 60, 80];

export interface BackgroundState {
  enabled: boolean;
  color: string;
  padding: number;
}

interface BackgroundControlsProps {
  background: BackgroundState;
  cornerRadius: number;
  onEnabledChange: (v: boolean) => void;
  onColorChange: (c: string) => void;
  onPaddingChange: (p: number) => void;
  onCornerRadiusChange: (r: number) => void;
}

export function BackgroundControls({
  background,
  cornerRadius,
  onEnabledChange,
  onColorChange,
  onPaddingChange,
  onCornerRadiusChange,
}: BackgroundControlsProps) {
  const { t } = useLocalization();
  const bgLabel = t("Background", "背景");
  const paddingLabel = t("Padding", "余白");
  const radiusLabel = t("Corner radius", "角丸");

  return (
    <div className="flex items-center gap-3 px-4 py-1.5 border-t border-tb-border/50 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-tb-text-sub tracking-wide uppercase">
          {bgLabel}
        </span>
        <button
          className="toggle-switch"
          role="switch"
          aria-checked={background.enabled}
          aria-label={bgLabel}
          data-on={background.enabled ? "true" : "false"}
          onClick={() => onEnabledChange(!background.enabled)}
        />
      </div>

      {background.enabled && (
        <>
          <label
            className="relative w-6 h-6 rounded-full cursor-pointer flex-shrink-0 ring-2 ring-tb-border hover:ring-tb-active transition-all"
            title={t("Background color", "背景色を選択")}
            style={{ backgroundColor: background.color }}
          >
            <input
              type="color"
              value={background.color}
              onChange={(e) => onColorChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label={t("Background color", "背景色を選択")}
            />
          </label>

          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-tb-text-sub tracking-wide uppercase mr-1">
              {paddingLabel}
            </span>
            <div className="flex bg-tb-base rounded-lg overflow-hidden border border-tb-border/50">
              {PADDING_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => onPaddingChange(p)}
                  className={`px-2 py-1 text-[11px] font-medium transition-all duration-150 ${
                    background.padding === p
                      ? "bg-tb-selected/14 text-tb-text"
                      : "text-tb-text-dim hover:text-tb-text-sub hover:bg-tb-hover"
                  }`}
                >
                  {p === 0 ? t("None", "なし") : `${p}px`}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="w-px h-4 bg-tb-border/50" />

      <div className="flex items-center gap-2" title={t("Image pixels", "画像のピクセル単位")}>
        <span className="text-[11px] font-medium text-tb-text-sub tracking-wide uppercase">
          {radiusLabel}
        </span>
        <input
          type="range"
          min={0}
          max={60}
          value={cornerRadius}
          onChange={(e) => onCornerRadiusChange(Number(e.target.value))}
          className="slider-tb w-20"
          aria-label={`${radiusLabel} (${t("image pixels", "画像ピクセル")})`}
        />
        <span className="text-[11px] font-mono tabular-nums text-tb-text-dim w-9 text-right">
          {cornerRadius}px
        </span>
      </div>
    </div>
  );
}
