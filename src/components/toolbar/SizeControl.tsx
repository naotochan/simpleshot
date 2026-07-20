import type { Tool } from "../../types/annotation";
import {
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
  effectiveSizeFromBrush,
  sizeControlLabel,
} from "../../lib/brushSize";

interface SizeControlProps {
  tool: Tool;
  size: number;
  onChange: (s: number) => void;
}

export function SizeControl({ tool, size, onChange }: SizeControlProps) {
  const effective = effectiveSizeFromBrush(tool, size);
  const showEffectiveHint = effective !== size;

  return (
    <div className="tool-group" title="画像のピクセル単位">
      <span className="text-[11px] font-medium text-tb-text-sub tracking-wide uppercase px-1">
        {sizeControlLabel(tool)}
      </span>
      <input
        type="range"
        min={BRUSH_SIZE_MIN}
        max={BRUSH_SIZE_MAX}
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-tb w-24"
        aria-label={`${sizeControlLabel(tool)}（画像ピクセル）`}
      />
      <div className="flex items-center gap-0.5">
        <input
          type="number"
          min={BRUSH_SIZE_MIN}
          max={BRUSH_SIZE_MAX}
          value={size}
          onChange={(e) => {
            const v = Math.max(
              BRUSH_SIZE_MIN,
              Math.min(BRUSH_SIZE_MAX, Number(e.target.value) || BRUSH_SIZE_MIN)
            );
            onChange(v);
          }}
          className="w-10 bg-tb-base text-tb-text text-[11px] font-mono tabular-nums text-center rounded-md border border-tb-border px-1 py-0.5 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          aria-label={`${sizeControlLabel(tool)}の数値`}
        />
        <span className="text-[11px] font-mono text-tb-text-dim">px</span>
        {showEffectiveHint && (
          <span
            className="text-[10px] font-mono text-tb-text-dim ml-0.5 whitespace-nowrap"
            title="実際の描画サイズ"
          >
            → {effective}px
          </span>
        )}
      </div>
    </div>
  );
}
