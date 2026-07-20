import { useCallback, useEffect, useState, type MutableRefObject, type RefObject } from "react";
import type { Annotation, Point, Tool } from "../types/annotation";
import { shiftAnnotation } from "../lib/annotationFactory";

interface PreCropState {
  imageData: string;
  annotations: Annotation[];
  imgSize: { w: number; h: number };
}

interface UseCropOpts {
  currentTool: Tool;
  setCurrentTool: (t: Tool) => void;
  imageData: string | null;
  setImageData: (v: string | null) => void;
  annotations: Annotation[];
  imgSize: { w: number; h: number };
  setImgSize: (s: { w: number; h: number }) => void;
  resetHistory: (anns: Annotation[]) => void;
  applyDisplaySize: (w: number, h: number) => number;
  imageCanvasRef: RefObject<HTMLCanvasElement | null>;
  annotationCanvasRef: RefObject<HTMLCanvasElement | null>;
  baseLayerRef: MutableRefObject<HTMLCanvasElement | null>;
  ensureBaseLayer: () => HTMLCanvasElement | null;
  rebuildBaseLayer: (anns: Annotation[]) => void;
  annotationsRef: MutableRefObject<Annotation[]>;
  sizeMul: number;
  setStatus: (s: string) => void;
}

export function useCrop({
  currentTool,
  setCurrentTool,
  imageData,
  setImageData,
  annotations,
  imgSize,
  setImgSize,
  resetHistory,
  applyDisplaySize,
  imageCanvasRef,
  annotationCanvasRef,
  baseLayerRef,
  ensureBaseLayer,
  rebuildBaseLayer,
  annotationsRef,
  sizeMul,
  setStatus,
}: UseCropOpts) {
  const [cropRegion, setCropRegion] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropDrawing, setCropDrawing] = useState(false);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [preCropState, setPreCropState] = useState<PreCropState | null>(null);

  const beginCrop = useCallback((pos: Point) => {
    setCropDrawing(true);
    setCropStart(pos);
    setCropRegion(null);
  }, []);

  const updateCrop = useCallback(
    (pos: Point) => {
      if (!cropDrawing || !cropStart) return;
      const x = Math.min(cropStart.x, pos.x);
      const y = Math.min(cropStart.y, pos.y);
      const w = Math.abs(pos.x - cropStart.x);
      const h = Math.abs(pos.y - cropStart.y);
      setCropRegion({ x, y, w, h });
    },
    [cropDrawing, cropStart]
  );

  const endCropDraw = useCallback(() => {
    setCropDrawing(false);
    setCropStart(null);
  }, []);

  const handleCropApply = useCallback(() => {
    if (!cropRegion || cropRegion.w < 2 || cropRegion.h < 2) return;
    const imgCanvas = imageCanvasRef.current;
    const annCanvas = annotationCanvasRef.current;
    if (!imgCanvas || !annCanvas || !imageData) return;

    setPreCropState({ imageData, annotations: [...annotations], imgSize: { ...imgSize } });

    const { x, y, w, h } = cropRegion;
    const imgCtx = imgCanvas.getContext("2d")!;
    const croppedImg = imgCtx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    const annCtx = annCanvas.getContext("2d")!;
    const croppedAnn = annCtx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

    imgCanvas.width = Math.round(w);
    imgCanvas.height = Math.round(h);
    annCanvas.width = Math.round(w);
    annCanvas.height = Math.round(h);
    imgCtx.putImageData(croppedImg, 0, 0);
    annCtx.putImageData(croppedAnn, 0, 0);

    const shifted = annotations.map((ann) => shiftAnnotation(ann, x, y));
    resetHistory(shifted);
    setImgSize({ w: Math.round(w), h: Math.round(h) });
    applyDisplaySize(Math.round(w), Math.round(h));
    setImageData(imgCanvas.toDataURL("image/png"));
    setCropRegion(null);
    setCurrentTool("arrow");
    setStatus("トリミングしました");
    setTimeout(() => setStatus("編集中"), 2000);
  }, [
    cropRegion,
    imageData,
    annotations,
    imgSize,
    imageCanvasRef,
    annotationCanvasRef,
    resetHistory,
    setImgSize,
    applyDisplaySize,
    setImageData,
    setCurrentTool,
    setStatus,
  ]);

  const handleCropCancel = useCallback(() => {
    setCropRegion(null);
    setCropDrawing(false);
    setCropStart(null);
    setCurrentTool("arrow");
    rebuildBaseLayer(annotationsRef.current);
  }, [setCurrentTool, rebuildBaseLayer, annotationsRef]);

  const handleCropRevert = useCallback(() => {
    if (!preCropState) return;
    setImageData(preCropState.imageData);
    resetHistory(preCropState.annotations);
    setImgSize(preCropState.imgSize);
    setPreCropState(null);
    setStatus("トリミングを元に戻しました");
    setTimeout(() => setStatus("編集中"), 2000);
  }, [preCropState, setImageData, resetHistory, setImgSize, setStatus]);

  useEffect(() => {
    if (currentTool !== "crop") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCropApply();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCropCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [currentTool, handleCropApply, handleCropCancel]);

  useEffect(() => {
    if (currentTool !== "crop" || !cropRegion) return;
    const canvas = annotationCanvasRef.current;
    const base = baseLayerRef.current ?? ensureBaseLayer();
    if (!canvas || !base) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.clearRect(cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h);
    ctx.drawImage(
      base,
      cropRegion.x,
      cropRegion.y,
      cropRegion.w,
      cropRegion.h,
      cropRegion.x,
      cropRegion.y,
      cropRegion.w,
      cropRegion.h
    );
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2 * sizeMul;
    ctx.setLineDash([6 * sizeMul, 3 * sizeMul]);
    ctx.strokeRect(cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h);
    ctx.setLineDash([]);
    ctx.restore();
  }, [
    cropRegion,
    currentTool,
    annotations,
    sizeMul,
    ensureBaseLayer,
    annotationCanvasRef,
    baseLayerRef,
  ]);

  const clearCropRegion = useCallback(() => setCropRegion(null), []);

  return {
    cropRegion,
    cropDrawing,
    preCropState,
    beginCrop,
    updateCrop,
    endCropDraw,
    handleCropApply,
    handleCropCancel,
    handleCropRevert,
    clearCropRegion,
    hasRegion: cropRegion !== null && cropRegion.w > 2 && cropRegion.h > 2,
    canRevert: preCropState !== null,
  };
}
