import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { onCaptureComplete, copyToClipboard, saveImage, getSettings, saveSettings } from "../lib/ipc";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Toolbar from "../components/Toolbar";
import type { Tool, AnnotationColor, ArrowStyle, Point, Annotation } from "../types/annotation";
import { drawAnnotation } from "../lib/draw";

export default function Editor() {
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [imageData, setImageData] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [currentTool, setCurrentTool] = useState<Tool>("arrow");
  const [currentColor, setCurrentColor] = useState<AnnotationColor>("#FF3B30");
  const [currentSize, setCurrentSize] = useState(3);
  const [currentArrowStyle, setCurrentArrowStyle] = useState<ArrowStyle>("uniform");
  const [shapeFilled, setShapeFilled] = useState(false);
  const [background, setBackground] = useState({
    enabled: false,
    color: "#1e1e2e",
    padding: 40,
  });
  const [drawing, setDrawing] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null);
  const [pendingText, setPendingText] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [status, setStatus] = useState("キャプチャを待っています...");
  const [scale, setScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const rafRef = useRef(0);
  const [cropRegion, setCropRegion] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [cropDrawing, setCropDrawing] = useState(false);
  const [cropStart, setCropStart] = useState<Point | null>(null);
  const [preCropState, setPreCropState] = useState<{
    imageData: string;
    annotations: Annotation[];
    imgSize: { w: number; h: number };
  } | null>(null);
  const [imageFormat, setImageFormat] = useState<"png" | "jpeg">("png");
  const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
  const [cornerRadius, setCornerRadius] = useState(0);
  const [isPickingColor, setIsPickingColor] = useState(false);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // 設定を読み込む
  useEffect(() => {
    getSettings().then((s) => {
      setImageFormat(s.image_format);
      setFavoriteColors(s.favorite_colors ?? []);
    }).catch(() => {});
  }, []);

  const saveFavoriteColors = (colors: string[]) => {
    getSettings().then((s) => saveSettings({ ...s, favorite_colors: colors })).catch(() => {});
  };

  const handleAddFavoriteColor = useCallback(() => {
    if (favoriteColors.length >= 8 || favoriteColors.includes(currentColor)) return;
    const updated = [...favoriteColors, currentColor];
    setFavoriteColors(updated);
    saveFavoriteColors(updated);
  }, [favoriteColors, currentColor]);

  const handleRemoveFavoriteColor = useCallback((index: number) => {
    const updated = favoriteColors.filter((_, i) => i !== index);
    setFavoriteColors(updated);
    saveFavoriteColors(updated);
  }, [favoriteColors]);

  const handleEyedrop = useCallback(() => {
    setIsPickingColor(true);
  }, []);

  // ウィンドウを閉じる際は hide にして再利用できるようにする
  useEffect(() => {
    const win = getCurrentWindow();
    let unlisten: (() => void) | null = null;
    win.onCloseRequested((event) => {
      event.preventDefault();
      win.hide();
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);

  // キャプチャ完了イベントを受け取る
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    onCaptureComplete((payload) => {
      setImageData("data:image/png;base64," + payload.image_base64);
      setImgSize({ w: payload.width, h: payload.height });
      setAnnotations([]);
      setHistory([[]]);
      setHistoryIndex(0);
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
      setCropRegion(null);
      setStatus("編集中");
    }).then((fn) => {
      unlisten = fn;
    });
    return () => { unlisten?.(); };
  }, []);

  // 表示サイズだけ CSS で合わせる（キャンバス画素は元解像度のまま）
  const applyDisplaySize = useCallback((nativeW: number, nativeH: number) => {
    const container = containerRef.current;
    const imgCanvas = imageCanvasRef.current;
    const annCanvas = annotationCanvasRef.current;
    if (!container || !imgCanvas || !annCanvas || nativeW <= 0 || nativeH <= 0) return 1;

    const pad = background.enabled ? background.padding : 0;
    const maxW = Math.max(1, container.clientWidth - pad * 2 - 32);
    const maxH = Math.max(1, container.clientHeight - pad * 2 - 32);
    const fit = Math.min(1, maxW / nativeW, maxH / nativeH);
    const dw = nativeW * fit;
    const dh = nativeH * fit;
    imgCanvas.style.width = `${dw}px`;
    imgCanvas.style.height = `${dh}px`;
    annCanvas.style.width = `${dw}px`;
    annCanvas.style.height = `${dh}px`;
    setScale(fit);
    return fit;
  }, [background.enabled, background.padding]);

  // 画像を元解像度のまま imageCanvas に描画
  useEffect(() => {
    if (!imageData || !imageCanvasRef.current) return;
    const canvas = imageCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);

      const annCanvas = annotationCanvasRef.current!;
      if (annCanvas.width !== img.width || annCanvas.height !== img.height) {
        annCanvas.width = img.width;
        annCanvas.height = img.height;
      }
      applyDisplaySize(img.width, img.height);
      setImgSize({ w: img.width, h: img.height });
    };
    img.src = imageData;
  }, [imageData, applyDisplaySize]);

  // 背景パディングやコンテナサイズ変更時は表示スケールだけ更新
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
  }, [background.enabled, background.padding, applyDisplaySize]);

  // UI の size → 画像 native 画素（画面上の見た目 ≈ ツールバー値）
  const sizeMul = scale > 0 ? 1 / scale : 1;

  // アノテーションを再描画（size は作成時に native へ焼き済み → scale=1）
  const redrawAnnotations = useCallback(
    (anns: Annotation[]) => {
      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const ann of anns) drawAnnotation(ctx, ann, 1, imageCanvasRef.current);
    },
    []
  );

  useEffect(() => {
    redrawAnnotations(annotations);
  }, [annotations, redrawAnnotations]);

  // マウス座標 → 画像の native 画素座標
  const getPos = (e: React.MouseEvent): Point => {
    const canvas = annotationCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isPickingColor) {
      if (hoverColor) setCurrentColor(hoverColor);
      setIsPickingColor(false);
      setHoverColor(null);
      return;
    }
    if (spaceHeld || isPanning) return;
    if (currentTool === "hand") {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y };
      return;
    }
    if (currentTool === "crop") {
      const pos = getPos(e);
      setCropDrawing(true);
      setCropStart(pos);
      setCropRegion(null);
      return;
    }
    if (currentTool === "text") {
      setPendingText(getPos(e));
      setTextInput("");
      return;
    }
    const pos = getPos(e);
    setDrawing(true);
    setCurrentAnnotation({
      tool: currentTool,
      color: currentColor,
      size: currentSize * sizeMul,
      points: [pos, pos],
      arrowStyle: currentArrowStyle,
      filled: (currentTool === "rect" || currentTool === "ellipse") ? shapeFilled : undefined,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPickingColor) {
      const canvas = imageCanvasRef.current;
      if (!canvas) return;
      const pos = getPos(e);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      if (x >= 0 && y >= 0 && x < canvas.width && y < canvas.height) {
        const d = canvas.getContext("2d")!.getImageData(x, y, 1, 1).data;
        const hex = `#${d[0].toString(16).padStart(2, "0")}${d[1].toString(16).padStart(2, "0")}${d[2].toString(16).padStart(2, "0")}`;
        setHoverColor(hex);
        setHoverPos({ x: e.clientX, y: e.clientY });
      }
      return;
    }
    if (isPanning && currentTool === "hand") {
      setPanOffset({
        x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
        y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
      });
      return;
    }
    if (cropDrawing && cropStart) {
      const pos = getPos(e);
      const x = Math.min(cropStart.x, pos.x);
      const y = Math.min(cropStart.y, pos.y);
      const w = Math.abs(pos.x - cropStart.x);
      const h = Math.abs(pos.y - cropStart.y);
      setCropRegion({ x, y, w, h });
      redrawAnnotations(annotations);
      return;
    }
    if (!drawing || !currentAnnotation) return;
    let pos = getPos(e);

    // Shift キーで正方形/真円に制約
    if (e.shiftKey && (currentTool === "rect" || currentTool === "ellipse")) {
      const start = currentAnnotation.points[0];
      const w = pos.x - start.x;
      const h = pos.y - start.y;
      const side = Math.max(Math.abs(w), Math.abs(h));
      pos = { x: start.x + side * Math.sign(w || 1), y: start.y + side * Math.sign(h || 1) };
    }

    const updated = {
      ...currentAnnotation,
      points:
        currentTool === "pen" || currentTool === "highlighter"
          ? [...currentAnnotation.points, pos]
          : [currentAnnotation.points[0], pos],
    };
    setCurrentAnnotation(updated);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      redrawAnnotations(annotations);
      drawAnnotation(ctx, updated, 1, imageCanvasRef.current);
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning && currentTool === "hand") {
      setIsPanning(false);
      return;
    }
    if (cropDrawing) {
      setCropDrawing(false);
      setCropStart(null);
      return;
    }
    if (!drawing || !currentAnnotation) return;
    const pos = getPos(e);
    const finalAnn = {
      ...currentAnnotation,
      points:
        currentTool === "pen" || currentTool === "highlighter"
          ? [...currentAnnotation.points, pos]
          : [currentAnnotation.points[0], pos],
    };
    const newAnnotations = [...annotations, finalAnn];
    setAnnotations(newAnnotations);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setDrawing(false);
    setCurrentAnnotation(null);
  };

  const handleUndo = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx <= 0) return idx;
      const newIdx = idx - 1;
      setAnnotations(history[newIdx]);
      return newIdx;
    });
  }, [history]);

  const handleRedo = useCallback(() => {
    setHistoryIndex((idx) => {
      if (idx >= history.length - 1) return idx;
      const newIdx = idx + 1;
      setAnnotations(history[newIdx]);
      return newIdx;
    });
  }, [history]);

  // キーボードショートカット
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          handleRedo();
        } else if (e.key === "0") {
          e.preventDefault();
          setZoom(1);
          setPanOffset({ x: 0, y: 0 });
        }
        return;
      }
      if (e.key === "Escape" && isPickingColor) {
        setIsPickingColor(false);
        setHoverColor(null);
        return;
      }
      if (e.key === " " && !e.repeat) {
        e.preventDefault();
        setSpaceHeld(true);
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
  }, [handleUndo, handleRedo, isPickingColor]);

  // ホイールズーム
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(10, Math.max(0.25, z + delta)));
  };

  // パン用マウスハンドラ (コンテナレベル)
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (spaceHeld || e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY, panX: panOffset.x, panY: panOffset.y };
    }
  };
  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPanOffset({
      x: panStartRef.current.panX + (e.clientX - panStartRef.current.x),
      y: panStartRef.current.panY + (e.clientY - panStartRef.current.y),
    });
  };
  const handleContainerMouseUp = () => {
    if (isPanning) setIsPanning(false);
  };

  // トリミング適用
  const handleCropApply = useCallback(() => {
    if (!cropRegion || cropRegion.w < 2 || cropRegion.h < 2) return;
    const imgCanvas = imageCanvasRef.current;
    const annCanvas = annotationCanvasRef.current;
    if (!imgCanvas || !annCanvas || !imageData) return;

    // crop 前の状態を保存
    setPreCropState({ imageData, annotations: [...annotations], imgSize: { ...imgSize } });

    const { x, y, w, h } = cropRegion;

    // imageCanvas から切り出し
    const imgCtx = imgCanvas.getContext("2d")!;
    const croppedImg = imgCtx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

    // annotationCanvas から切り出し
    const annCtx = annCanvas.getContext("2d")!;
    const croppedAnn = annCtx.getImageData(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

    // Canvas リサイズ
    imgCanvas.width = Math.round(w);
    imgCanvas.height = Math.round(h);
    annCanvas.width = Math.round(w);
    annCanvas.height = Math.round(h);
    imgCtx.putImageData(croppedImg, 0, 0);
    annCtx.putImageData(croppedAnn, 0, 0);

    // アノテーション座標をオフセット
    const shifted = annotations.map((ann) => ({
      ...ann,
      points: ann.points.map((p) => ({ x: p.x - x, y: p.y - y })),
    }));
    setAnnotations(shifted);

    // 画像サイズ更新（キャンバスは元解像度座標のまま）
    setImgSize({ w: Math.round(w), h: Math.round(h) });
    applyDisplaySize(Math.round(w), Math.round(h));

    // imageData も更新（再描画時に元サイズに戻らないように）
    setImageData(imgCanvas.toDataURL("image/png"));

    // 履歴リセット
    setHistory([shifted]);
    setHistoryIndex(0);

    setCropRegion(null);
    setCurrentTool("arrow");
    setStatus("トリミングしました");
    setTimeout(() => setStatus("編集中"), 2000);
  }, [cropRegion, imageData, annotations, imgSize, applyDisplaySize]);

  const handleCropCancel = useCallback(() => {
    setCropRegion(null);
    setCropDrawing(false);
    setCropStart(null);
    setCurrentTool("arrow");
  }, []);

  // トリミングを元に戻す
  const handleCropRevert = useCallback(() => {
    if (!preCropState) return;
    setImageData(preCropState.imageData);
    setAnnotations(preCropState.annotations);
    setImgSize(preCropState.imgSize);
    setHistory([preCropState.annotations]);
    setHistoryIndex(0);
    setPreCropState(null);
    setStatus("トリミングを元に戻しました");
    setTimeout(() => setStatus("編集中"), 2000);
  }, [preCropState]);

  // crop ツール用のキーボードショートカット
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

  // crop オーバーレイ描画
  useEffect(() => {
    if (currentTool !== "crop" || !cropRegion) return;
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // まず既存アノテーションを描画
    redrawAnnotations(annotations);

    // 暗いマスク
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 選択領域をクリア
    ctx.clearRect(cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h);
    // 選択領域内のアノテーションを再描画
    ctx.save();
    ctx.beginPath();
    ctx.rect(cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h);
    ctx.clip();
    for (const ann of annotations) drawAnnotation(ctx, ann, 1, imageCanvasRef.current);
    ctx.restore();
    // 枠線
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2 * sizeMul;
    ctx.setLineDash([6 * sizeMul, 3 * sizeMul]);
    ctx.strokeRect(cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h);
    ctx.setLineDash([]);
    ctx.restore();
  }, [cropRegion, currentTool, annotations, sizeMul, redrawAnnotations]);

  const handleTextSubmit = () => {
    if (!pendingText || !textInput.trim()) { setPendingText(null); return; }
    const ann: Annotation = {
      tool: "text",
      color: currentColor,
      // 入力欄は CSS px、描画・書き出しは native 画素
      size: (currentSize * 6 + 12) * sizeMul,
      points: [pendingText, pendingText],
      text: textInput,
    };
    const newAnnotations = [...annotations, ann];
    setAnnotations(newAnnotations);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newAnnotations);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setPendingText(null);
    setTextInput("");
  };

  // 背景込みで合成してエクスポート（元解像度のまま）
  const compositeCanvas = useCallback((): HTMLCanvasElement => {
    const imgC = imageCanvasRef.current!;
    const annC = annotationCanvasRef.current!;
    const out = document.createElement("canvas");
    const ctx = out.getContext("2d")!;
    // UI 上の padding / 角丸は CSS px → native 画素へ
    const pxPad = background.enabled ? Math.round(background.padding * sizeMul) : 0;
    const pxRadius = cornerRadius > 0 ? cornerRadius * sizeMul : 0;

    if (!background.enabled) {
      out.width = imgC.width;
      out.height = imgC.height;
      // JPEG + 角丸の場合、透過部分が黒くなるので白で塗りつぶす
      if (pxRadius > 0 && imageFormat === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
      }
      if (pxRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, imgC.width, imgC.height, pxRadius);
        ctx.clip();
      }
      ctx.drawImage(imgC, 0, 0);
      ctx.drawImage(annC, 0, 0);
      if (pxRadius > 0) {
        ctx.restore();
      }
    } else {
      out.width = imgC.width + pxPad * 2;
      out.height = imgC.height + pxPad * 2;

      // 背景色を描画
      ctx.fillStyle = background.color;
      ctx.fillRect(0, 0, out.width, out.height);

      // スクショを角丸でクリップして描画
      if (pxRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pxPad, pxPad, imgC.width, imgC.height, pxRadius);
        ctx.clip();
      }
      ctx.drawImage(imgC, pxPad, pxPad);
      ctx.drawImage(annC, pxPad, pxPad);
      if (pxRadius > 0) {
        ctx.restore();
      }
    }
    return out;
  }, [background, cornerRadius, imageFormat, sizeMul]);

  const handleCopy = useCallback(async () => {
    try {
      const out = compositeCanvas();
      const mime = imageFormat === "jpeg" ? "image/jpeg" : "image/png";
      const prefix = `data:${mime};base64,`;
      const b64 = out.toDataURL(mime).replace(prefix, "");
      await copyToClipboard(b64, imageFormat === "jpeg" ? "jpg" : "png");
      setStatus("クリップボードにコピーしました");
      setTimeout(() => setStatus("編集中"), 2000);
    } catch (err) {
      setStatus(`コピーに失敗しました: ${err}`);
      setTimeout(() => setStatus("編集中"), 3000);
    }
  }, [compositeCanvas, imageFormat]);

  const handleSave = useCallback(async () => {
    try {
      const out = compositeCanvas();
      const isJpeg = imageFormat === "jpeg";
      const mime = isJpeg ? "image/jpeg" : "image/png";
      const ext = isJpeg ? "jpg" : "png";
      const prefix = `data:${mime};base64,`;
      const b64 = out.toDataURL(mime).replace(prefix, "");

      const settings = await getSettings();
      const dir = settings.save_directory;
      const now = new Date();
      const yyyy = now.getFullYear().toString();
      const mo = (now.getMonth() + 1).toString().padStart(2, "0");
      const dd = now.getDate().toString().padStart(2, "0");
      const hh = now.getHours().toString().padStart(2, "0");
      const mm = now.getMinutes().toString().padStart(2, "0");
      const ss = now.getSeconds().toString().padStart(2, "0");
      const filename = `simpleshot-${yyyy}${mo}${dd}-${hh}${mm}${ss}.${ext}`;
      const fullPath = `${dir}/${filename}`;

      await saveImage(b64, fullPath);
      setStatus(`保存しました: ${fullPath}`);
      setTimeout(() => getCurrentWindow().hide(), 500);
    } catch (err) {
      setStatus(`保存に失敗しました: ${err}`);
      setTimeout(() => setStatus("編集中"), 3000);
    }
  }, [compositeCanvas, imageFormat]);

  const pad = background.enabled ? background.padding : 0;

  const toolControls = useMemo(
    () => ({
      current: currentTool,
      color: currentColor,
      size: currentSize,
      arrowStyle: currentArrowStyle,
      shapeFilled,
      onToolChange: setCurrentTool,
      onColorChange: setCurrentColor,
      onSizeChange: setCurrentSize,
      onArrowStyleChange: setCurrentArrowStyle,
      onShapeFilledChange: setShapeFilled,
    }),
    [currentTool, currentColor, currentSize, currentArrowStyle, shapeFilled]
  );

  const backgroundControls = useMemo(
    () => ({
      ...background,
      onEnabledChange: (enabled: boolean) => setBackground((b) => ({ ...b, enabled })),
      onColorChange: (color: string) => setBackground((b) => ({ ...b, color })),
      onPaddingChange: (padding: number) => setBackground((b) => ({ ...b, padding })),
    }),
    [background]
  );

  const frameControls = useMemo(
    () => ({
      cornerRadius,
      onCornerRadiusChange: setCornerRadius,
    }),
    [cornerRadius]
  );

  const historyControls = useMemo(
    () => ({
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      onUndo: handleUndo,
      onRedo: handleRedo,
    }),
    [historyIndex, history.length, handleUndo, handleRedo]
  );

  const cropControls = useMemo(
    () => ({
      hasRegion: cropRegion !== null && cropRegion.w > 2 && cropRegion.h > 2,
      canRevert: preCropState !== null,
      onApply: handleCropApply,
      onCancel: handleCropCancel,
      onRevert: handleCropRevert,
    }),
    [cropRegion, preCropState, handleCropApply, handleCropCancel, handleCropRevert]
  );

  const colorControls = useMemo(
    () => ({
      favorites: favoriteColors,
      isPicking: isPickingColor,
      onAddFavorite: handleAddFavoriteColor,
      onRemoveFavorite: handleRemoveFavoriteColor,
      onEyedrop: handleEyedrop,
    }),
    [favoriteColors, isPickingColor, handleAddFavoriteColor, handleRemoveFavoriteColor, handleEyedrop]
  );

  return (
    <div className="flex flex-col h-screen bg-tb-base select-none">
      <Toolbar
        tool={toolControls}
        background={backgroundControls}
        frame={frameControls}
        history={historyControls}
        crop={cropControls}
        colors={colorControls}
        onCopy={handleCopy}
        onSave={handleSave}
      />

      {/* キャンバスエリア */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center bg-tb-canvas"
        style={{ minHeight: 0, cursor: spaceHeld || isPanning ? "grab" : undefined }}
        onWheel={handleWheel}
        onMouseDown={handleContainerMouseDown}
        onMouseMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onMouseLeave={handleContainerMouseUp}
      >
        {!imageData ? (
          <div className="text-tb-text-dim text-sm">{status}</div>
        ) : (
          /* 背景コンテナ */
          <div
            style={{
              background: background.enabled ? background.color : "transparent",
              padding: pad,
              borderRadius: background.enabled ? Math.max(cornerRadius, 8) + 8 : cornerRadius,
              lineHeight: 0,
              boxShadow: background.enabled ? "0 8px 40px rgba(0,0,0,0.5)" : "0 4px 32px rgba(0,0,0,0.4)",
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          >
            {/* スクショ + アノテーションレイヤー */}
            <div
              className="relative"
              style={{
                lineHeight: 0,
                borderRadius: cornerRadius,
                overflow: "hidden",
              }}
            >
              <canvas ref={imageCanvasRef} className="block" />
              <canvas
                ref={annotationCanvasRef}
                className="absolute inset-0"
                style={{ cursor: isPickingColor ? "crosshair" : currentTool === "hand" ? (isPanning ? "grabbing" : "grab") : "crosshair" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
              />
              {pendingText && (
                <input
                  autoFocus
                  className="absolute outline-none bg-transparent border-b border-blue-400"
                  style={{
                    left: pendingText.x * scale,
                    top: pendingText.y * scale,
                    fontSize: currentSize * 6 + 12,
                    color: currentColor,
                    minWidth: 80,
                  }}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTextSubmit();
                    if (e.key === "Escape") setPendingText(null);
                  }}
                  onBlur={handleTextSubmit}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* スポイト カラープレビュー */}
      {isPickingColor && hoverColor && (
        <div
          className="fixed pointer-events-none z-50 flex items-center gap-2 bg-tb-raised text-tb-text text-[11px] px-2.5 py-1.5 rounded-lg shadow-lg border border-tb-border"
          style={{ left: hoverPos.x + 18, top: hoverPos.y - 10 }}
        >
          <div className="w-4 h-4 rounded-sm border border-tb-border flex-shrink-0" style={{ backgroundColor: hoverColor }} />
          <span className="font-mono">{hoverColor}</span>
        </div>
      )}

      {/* ステータスバー */}
      <div className="flex items-center justify-between px-4 py-2 text-[11px] bg-tb-base border-t border-tb-border">
        <span className="text-tb-text-sub">{status}</span>
        {imgSize.w > 0 && (
          <div className="flex items-center gap-3 text-tb-text-dim font-mono tabular-nums">
            <span>{imgSize.w} <span className="opacity-40">x</span> {imgSize.h}</span>
            <span className="bg-tb-raised rounded px-1.5 py-0.5 text-tb-text-sub">{Math.round(zoom * scale * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
