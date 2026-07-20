import type { AnnotationColor } from "../../types/annotation";

interface BrushCursorProps {
  x: number;
  y: number;
  diameter: number;
  color: AnnotationColor;
  /** 画面上で約 1px の枠になるよう 1/displayScale */
  borderWidth: number;
  soft?: boolean;
}

/** 変換済みキャンバス空間内のブラシ円プレビュー */
export function BrushCursor({
  x,
  y,
  diameter,
  color,
  borderWidth,
  soft = false,
}: BrushCursorProps) {
  const size = Math.max(2, diameter);
  return (
    <div
      className="pointer-events-none absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: size,
        height: size,
        transform: "translate(-50%, -50%)",
        border: `${Math.max(borderWidth, 0.5)}px solid ${color}`,
        backgroundColor: soft ? `${color}33` : "transparent",
        boxSizing: "border-box",
        opacity: 0.9,
      }}
      aria-hidden
    />
  );
}
