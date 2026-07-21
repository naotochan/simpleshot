import { useEffect, useRef } from "react";
import type { AnnotationColor } from "../../types/annotation";

interface TextInputOverlayProps {
  x: number;
  y: number;
  fontSize: number;
  color: AnnotationColor;
  value: string;
  canvasWidth: number;
  canvasHeight: number;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function TextInputOverlay({
  x,
  y,
  fontSize,
  color,
  value,
  canvasWidth,
  canvasHeight,
  onChange,
  onSubmit,
  onCancel,
}: TextInputOverlayProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // 端クリックでも入力欄がはみ出さないようクランプ
  const left = Math.max(0, Math.min(x, Math.max(0, canvasWidth - 80)));
  const top = Math.max(0, Math.min(y, Math.max(0, canvasHeight - fontSize)));
  const maxWidth = Math.max(80, canvasWidth - left);

  return (
    <input
      ref={ref}
      className="absolute outline-none bg-transparent border-b border-tb-text/50 select-text"
      style={{
        left,
        top,
        fontSize,
        lineHeight: 1.2,
        height: Math.ceil(fontSize * 1.2),
        fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
        fontWeight: 700,
        color,
        caretColor: color,
        minWidth: 80,
        maxWidth,
        zIndex: 20,
        padding: 0,
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          onSubmit();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        // 空ならキャンセル、入力があれば確定
        if (value.trim()) onSubmit();
        else onCancel();
      }}
    />
  );
}
