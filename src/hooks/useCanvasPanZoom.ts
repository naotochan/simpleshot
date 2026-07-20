import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

interface UseCanvasPanZoomOpts {
  containerRef: RefObject<HTMLDivElement | null>;
  imageCanvasRef: RefObject<HTMLCanvasElement | null>;
  annotationCanvasRef: RefObject<HTMLCanvasElement | null>;
  backgroundEnabled: boolean;
  backgroundPadding: number;
}

export function useCanvasPanZoom({
  containerRef,
  imageCanvasRef,
  annotationCanvasRef,
  backgroundEnabled,
  backgroundPadding,
}: UseCanvasPanZoomOpts) {
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const applyDisplaySize = useCallback(
    (nativeW: number, nativeH: number) => {
      const container = containerRef.current;
      const imgCanvas = imageCanvasRef.current;
      const annCanvas = annotationCanvasRef.current;
      if (!container || !imgCanvas || !annCanvas || nativeW <= 0 || nativeH <= 0) return 1;

      const pad = backgroundEnabled ? backgroundPadding : 0;
      const maxW = Math.max(1, container.clientWidth - 32);
      const maxH = Math.max(1, container.clientHeight - 32);
      const fit = Math.min(1, maxW / (nativeW + pad * 2), maxH / (nativeH + pad * 2));
      imgCanvas.style.width = `${nativeW}px`;
      imgCanvas.style.height = `${nativeH}px`;
      annCanvas.style.width = `${nativeW}px`;
      annCanvas.style.height = `${nativeH}px`;
      setScale(fit);
      return fit;
    },
    [containerRef, imageCanvasRef, annotationCanvasRef, backgroundEnabled, backgroundPadding]
  );

  useEffect(() => {
    const imgCanvas = imageCanvasRef.current;
    if (!imgCanvas?.width) return;
    applyDisplaySize(imgCanvas.width, imgCanvas.height);

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (imgCanvas.width) applyDisplaySize(imgCanvas.width, imgCanvas.height);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [backgroundEnabled, backgroundPadding, applyDisplaySize, containerRef, imageCanvasRef]);

  const displayScale = scale * zoom;
  const sizeMul = displayScale > 0 ? 1 / displayScale : 1;

  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(10, Math.max(0.25, z + delta)));
  }, []);

  const beginPan = useCallback(
    (clientX: number, clientY: number) => {
      setIsPanning(true);
      panStartRef.current = {
        x: clientX,
        y: clientY,
        panX: panOffset.x,
        panY: panOffset.y,
      };
    },
    [panOffset.x, panOffset.y]
  );

  const movePan = useCallback((clientX: number, clientY: number) => {
    setPanOffset({
      x: panStartRef.current.panX + (clientX - panStartRef.current.x),
      y: panStartRef.current.panY + (clientY - panStartRef.current.y),
    });
  }, []);

  const endPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleContainerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (spaceHeld || e.button === 1) {
        e.preventDefault();
        beginPan(e.clientX, e.clientY);
      }
    },
    [spaceHeld, beginPan]
  );

  const handleContainerMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      movePan(e.clientX, e.clientY);
    },
    [isPanning, movePan]
  );

  const handleContainerMouseUp = useCallback(() => {
    if (isPanning) endPan();
  }, [isPanning, endPan]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === " " && !e.repeat && !e.metaKey) {
        e.preventDefault();
        setSpaceHeld(true);
      }
      if (e.metaKey && e.key === "0") {
        e.preventDefault();
        resetView();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " ") {
        setSpaceHeld(false);
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [resetView]);

  return {
    scale,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    isPanning,
    setIsPanning,
    spaceHeld,
    displayScale,
    sizeMul,
    applyDisplaySize,
    resetView,
    handleWheel,
    beginPan,
    movePan,
    endPan,
    handleContainerMouseDown,
    handleContainerMouseMove,
    handleContainerMouseUp,
  };
}
