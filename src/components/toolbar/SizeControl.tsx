import { useEffect, useState } from "react";
import type { AnnotationColor, Tool } from "../../types/annotation";
import {
  BRUSH_SIZE_MAX,
  BRUSH_SIZE_MIN,
  effectiveSizeFromBrush,
  sizeControlLabel,
} from "../../lib/brushSize";

interface SizeControlProps {
  tool: Tool;
  size: number;
  color: AnnotationColor;
  onChange: (s: number) => void;
}

/** Snipping Tool 風: スライダー操作中に実効サイズを円／文字で見せる */
function SizePreviewBubble({
  tool,
  size,
  color,
}: {
  tool: Tool;
  size: number;
  color: AnnotationColor;
}) {
  const effective = effectiveSizeFromBrush(tool, size);
  const visual = Math.min(effective, 64);

  return (
    <div
      className="absolute left-1/2 top-full mt-2 z-50 -translate-x-1/2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-tb-border bg-tb-raised/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
        {tool === "text" ? (
          <span
            className="font-bold leading-none whitespace-nowrap"
            style={{
              color,
              fontSize: Math.min(effective, 40),
              fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            }}
          >
            Aa
          </span>
        ) : tool === "mosaic" ? (
          <div
            className="grid grid-cols-2 gap-px overflow-hidden rounded-sm"
            style={{ width: visual, height: visual }}
          >
            <div className="bg-tb-text-dim" />
            <div className="bg-tb-text" />
            <div className="bg-tb-text" />
            <div className="bg-tb-text-dim" />
          </div>
        ) : (
          <div
            className="rounded-full"
            style={{
              width: Math.max(4, visual),
              height: Math.max(4, visual),
              backgroundColor: tool === "highlighter" ? `${color}59` : color,
              boxShadow: `0 0 0 1px rgba(255,255,255,0.15)`,
            }}
          />
        )}
        <span className="text-[10px] font-mono tabular-nums text-tb-text-sub">{effective}px</span>
      </div>
    </div>
  );
}

export function SizeControl({ tool, size, color, onChange }: SizeControlProps) {
  const [previewing, setPreviewing] = useState(false);
  const effective = effectiveSizeFromBrush(tool, size);
  const showEffectiveHint = effective !== size;

  useEffect(() => {
    if (!previewing) return;
    const end = () => setPreviewing(false);
    window.addEventListener("pointerup", end);
    window.addEventListener("blur", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("blur", end);
    };
  }, [previewing]);

  return (
    <div className="tool-group relative" title="画像のピクセル単位">
      <span className="text-[11px] font-medium text-tb-text-sub tracking-wide uppercase px-1">
        {sizeControlLabel(tool)}
      </span>
      <input
        type="range"
        min={BRUSH_SIZE_MIN}
        max={BRUSH_SIZE_MAX}
        value={size}
        onPointerDown={() => setPreviewing(true)}
        onChange={(e) => {
          setPreviewing(true);
          onChange(Number(e.target.value));
        }}
        className="slider-tb w-24"
        aria-label={`${sizeControlLabel(tool)}（画像ピクセル）`}
      />
      <div className="flex items-center gap-0.5">
        <input
          type="number"
          min={BRUSH_SIZE_MIN}
          max={BRUSH_SIZE_MAX}
          value={size}
          onFocus={() => setPreviewing(true)}
          onBlur={() => setPreviewing(false)}
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
      {previewing && <SizePreviewBubble tool={tool} size={size} color={color} />}
    </div>
  );
}
