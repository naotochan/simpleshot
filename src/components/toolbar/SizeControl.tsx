import { BRUSH_SIZE_MAX, BRUSH_SIZE_MIN } from "../../lib/brushSize";

interface SizeControlProps {
  size: number;
  onChange: (s: number) => void;
}

export function SizeControl({ size, onChange }: SizeControlProps) {
  return (
    <div className="tool-group" title="画像のピクセル単位">
      <span className="text-[11px] font-medium text-tb-text-sub tracking-wide uppercase px-1">太さ</span>
      <input
        type="range"
        min={BRUSH_SIZE_MIN}
        max={BRUSH_SIZE_MAX}
        value={size}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-tb w-24"
        aria-label="太さ（画像ピクセル）"
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
          aria-label="太さの数値（px）"
        />
        <span className="text-[11px] font-mono text-tb-text-dim">px</span>
      </div>
    </div>
  );
}
