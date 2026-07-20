import { useCallback, useEffect, useState } from "react";
import type { AnnotationColor, Point } from "../types/annotation";

interface UseEyedropperOpts {
  onPick: (color: AnnotationColor) => void;
}

export function useEyedropper({ onPick }: UseEyedropperOpts) {
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  const startEyedrop = useCallback(() => {
    setIsPickingColor(true);
  }, []);

  const cancelEyedrop = useCallback(() => {
    setIsPickingColor(false);
    setHoverColor(null);
  }, []);

  const commitEyedrop = useCallback(() => {
    if (hoverColor) onPick(hoverColor);
    setIsPickingColor(false);
    setHoverColor(null);
  }, [hoverColor, onPick]);

  const sampleAt = useCallback(
    (
      e: React.MouseEvent,
      imageCanvas: HTMLCanvasElement | null,
      getPos: (e: React.MouseEvent) => Point
    ) => {
      if (!imageCanvas) return;
      const pos = getPos(e);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      if (x >= 0 && y >= 0 && x < imageCanvas.width && y < imageCanvas.height) {
        const d = imageCanvas.getContext("2d")!.getImageData(x, y, 1, 1).data;
        const hex = `#${d[0].toString(16).padStart(2, "0")}${d[1].toString(16).padStart(2, "0")}${d[2].toString(16).padStart(2, "0")}`;
        setHoverColor(hex);
        setHoverPos({ x: e.clientX, y: e.clientY });
      }
    },
    []
  );

  useEffect(() => {
    if (!isPickingColor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEyedrop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isPickingColor, cancelEyedrop]);

  return {
    isPickingColor,
    hoverColor,
    hoverPos,
    startEyedrop,
    cancelEyedrop,
    commitEyedrop,
    sampleAt,
  };
}
