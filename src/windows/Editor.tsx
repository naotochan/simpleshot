import { useEffect, useRef, useState, useCallback } from "react";
import { onCaptureComplete, copyToClipboard, saveImage, getSettings, saveSettings } from "../lib/ipc";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Toolbar, {
  type Tool,
  type AnnotationColor,
  type ArrowStyle,
} from "../components/Toolbar";

interface Point {
  x: number;
  y: number;
}

interface Annotation {
  tool: Tool;
  color: AnnotationColor;
  size: number;
  points: Point[];
  text?: string;
  arrowStyle?: ArrowStyle;
  filled?: boolean;
}

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
  const [bgEnabled, setBgEnabled] = useState(false);
  const [bgColor, setBgColor] = useState("#1e1e2e");
  const [bgPadding, setBgPadding] = useState(40);
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

  // 画像を imageCanvas に描画
  useEffect(() => {
    if (!imageData || !imageCanvasRef.current) return;
    const canvas = imageCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const container = containerRef.current;
      if (!container) return;

      const pad = bgEnabled ? bgPadding : 0;
      const maxW = container.clientWidth - pad * 2 - 32;
      const maxH = container.clientHeight - pad * 2 - 32;
      const scaleX = maxW / img.width;
      const scaleY = maxH / img.height;
      const s = Math.min(1, scaleX, scaleY);

      const prevW = canvas.width;
      const prevH = canvas.height;
      const newW = img.width * s;
      const newH = img.height * s;

      setScale(s);
      canvas.width = newW;
      canvas.height = newH;
      ctx.drawImage(img, 0, 0, newW, newH);

      // サイズが変わった場合のみアノテーション canvas をリサイズ
      const annCanvas = annotationCanvasRef.current!;
      if (Math.round(prevW) !== Math.round(newW) || Math.round(prevH) !== Math.round(newH)) {
        // 既存のアノテーション描画を一時保存
        const annCtx = annCanvas.getContext("2d")!;
        const annImageData = annCtx.getImageData(0, 0, annCanvas.width, annCanvas.height);
        annCanvas.width = newW;
        annCanvas.height = newH;
        annCtx.putImageData(annImageData, 0, 0);
      }
    };
    img.src = imageData;
  }, [imageData, bgEnabled, bgPadding]);

  // アノテーションを再描画
  const redrawAnnotations = useCallback(
    (anns: Annotation[]) => {
      const canvas = annotationCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const ann of anns) drawAnnotation(ctx, ann, scale, imageCanvasRef.current);
    },
    [scale]
  );

  useEffect(() => {
    redrawAnnotations(annotations);
  }, [annotations, redrawAnnotations]);

  // マウスイベント
  const getPos = (e: React.MouseEvent): Point => {
    const canvas = annotationCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom };
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
      size: currentSize,
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
      drawAnnotation(ctx, updated, scale, imageCanvasRef.current);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTool, cropRegion, imageData, annotations, imgSize, scale]);

  // ホイールズーム
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.min(5, Math.max(0.25, z + delta)));
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
  const handleCropApply = () => {
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

    // 画像サイズ更新
    setImgSize({ w: Math.round(w / scale), h: Math.round(h / scale) });

    // imageData も更新（再描画時に元サイズに戻らないように）
    setImageData(imgCanvas.toDataURL("image/png"));

    // 履歴リセット
    setHistory([shifted]);
    setHistoryIndex(0);

    setCropRegion(null);
    setCurrentTool("arrow");
    setStatus("トリミングしました");
    setTimeout(() => setStatus("編集中"), 2000);
  };

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
    for (const ann of annotations) drawAnnotation(ctx, ann, scale, imageCanvasRef.current);
    ctx.restore();
    // 枠線
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(cropRegion.x, cropRegion.y, cropRegion.w, cropRegion.h);
    ctx.setLineDash([]);
    ctx.restore();
  }, [cropRegion, currentTool, annotations, scale, redrawAnnotations]);

  const handleTextSubmit = () => {
    if (!pendingText || !textInput.trim()) { setPendingText(null); return; }
    const ann: Annotation = {
      tool: "text",
      color: currentColor,
      size: currentSize * 6 + 12,
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

  // 背景込みで合成してエクスポート
  const compositeCanvas = (): HTMLCanvasElement => {
    const imgC = imageCanvasRef.current!;
    const annC = annotationCanvasRef.current!;
    const out = document.createElement("canvas");
    const ctx = out.getContext("2d")!;

    if (!bgEnabled) {
      out.width = imgC.width;
      out.height = imgC.height;
      // JPEG + 角丸の場合、透過部分が黒くなるので白で塗りつぶす
      if (cornerRadius > 0 && imageFormat === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, out.width, out.height);
      }
      if (cornerRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, imgC.width, imgC.height, cornerRadius);
        ctx.clip();
      }
      ctx.drawImage(imgC, 0, 0);
      ctx.drawImage(annC, 0, 0);
      if (cornerRadius > 0) {
        ctx.restore();
      }
    } else {
      const pad = bgPadding;
      out.width = imgC.width + pad * 2;
      out.height = imgC.height + pad * 2;

      // 背景色を描画
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, out.width, out.height);

      // スクショを角丸でクリップして描画
      if (cornerRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pad, pad, imgC.width, imgC.height, cornerRadius);
        ctx.clip();
      }
      ctx.drawImage(imgC, pad, pad);
      ctx.drawImage(annC, pad, pad);
      if (cornerRadius > 0) {
        ctx.restore();
      }
    }
    return out;
  };

  const handleCopy = async () => {
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
  };

  const handleSave = async () => {
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
  };

  const pad = bgEnabled ? bgPadding : 0;

  return (
    <div className="flex flex-col h-screen bg-tb-base select-none">
      <Toolbar
        currentTool={currentTool}
        currentColor={currentColor}
        currentSize={currentSize}
        currentArrowStyle={currentArrowStyle}
        shapeFilled={shapeFilled}
        bgEnabled={bgEnabled}
        bgColor={bgColor}
        bgPadding={bgPadding}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        hasCropRegion={cropRegion !== null && cropRegion.w > 2 && cropRegion.h > 2}
        onToolChange={setCurrentTool}
        onColorChange={setCurrentColor}
        onSizeChange={setCurrentSize}
        onArrowStyleChange={setCurrentArrowStyle}
        onShapeFilledChange={setShapeFilled}
        onBgEnabledChange={setBgEnabled}
        onBgColorChange={setBgColor}
        onBgPaddingChange={setBgPadding}
        cornerRadius={cornerRadius}
        onCornerRadiusChange={setCornerRadius}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCopy={handleCopy}
        onSave={handleSave}
        onCropApply={handleCropApply}
        onCropCancel={handleCropCancel}
        canCropRevert={preCropState !== null}
        onCropRevert={handleCropRevert}
        favoriteColors={favoriteColors}
        isPickingColor={isPickingColor}
        onAddFavoriteColor={handleAddFavoriteColor}
        onRemoveFavoriteColor={handleRemoveFavoriteColor}
        onEyedrop={handleEyedrop}
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
              background: bgEnabled ? bgColor : "transparent",
              padding: pad,
              borderRadius: bgEnabled ? Math.max(cornerRadius, 8) + 8 : cornerRadius,
              lineHeight: 0,
              boxShadow: bgEnabled ? "0 8px 40px rgba(0,0,0,0.5)" : "0 4px 32px rgba(0,0,0,0.4)",
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
                    left: pendingText.x,
                    top: pendingText.y,
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
            <span className="bg-tb-raised rounded px-1.5 py-0.5 text-tb-text-sub">{Math.round(zoom * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 描画ヘルパー
// ============================================================

function drawAnnotation(ctx: CanvasRenderingContext2D, ann: Annotation, scale: number, imageCanvas?: HTMLCanvasElement | null) {
  ctx.save();
  ctx.strokeStyle = ann.color;
  ctx.fillStyle = ann.color;
  ctx.lineWidth = ann.size * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const [start, end] = ann.points;

  switch (ann.tool) {
    case "arrow":
      if (ann.arrowStyle === "tapered") {
        drawTaperedArrow(ctx, start, end, ann.size * scale);
      } else {
        drawUniformArrow(ctx, start, end, ann.size * scale);
      }
      break;
    case "rect":
      if (ann.filled) {
        ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else {
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      }
      break;
    case "ellipse": {
      const rx = Math.abs(end.x - start.x) / 2;
      const ry = Math.abs(end.y - start.y) / 2;
      ctx.beginPath();
      ctx.ellipse((start.x + end.x) / 2, (start.y + end.y) / 2, rx, ry, 0, 0, Math.PI * 2);
      if (ann.filled) ctx.fill();
      else ctx.stroke();
      break;
    }
    case "pen":
      if (ann.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(ann.points[0].x, ann.points[0].y);
      for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
      ctx.stroke();
      break;
    case "highlighter":
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = ann.size * scale * 8;
      ctx.lineCap = "square";
      if (ann.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(ann.points[0].x, ann.points[0].y);
        for (let i = 1; i < ann.points.length; i++) ctx.lineTo(ann.points[i].x, ann.points[i].y);
        ctx.stroke();
      }
      ctx.restore();
      break;
    case "text":
      if (!ann.text) break;
      ctx.font = `bold ${ann.size}px -apple-system`;
      ctx.fillText(ann.text, start.x, start.y + ann.size);
      break;
    case "mosaic": {
      if (!imageCanvas) break;
      const imgCtx = imageCanvas.getContext("2d");
      if (!imgCtx) break;
      const mx = Math.round(Math.min(start.x, end.x));
      const my = Math.round(Math.min(start.y, end.y));
      const mw = Math.round(Math.abs(end.x - start.x));
      const mh = Math.round(Math.abs(end.y - start.y));
      if (mw < 2 || mh < 2) break;
      const blockSize = Math.max(4, ann.size * 4);
      const imgData = imgCtx.getImageData(mx, my, mw, mh);
      for (let bx = 0; bx < mw; bx += blockSize) {
        for (let by = 0; by < mh; by += blockSize) {
          const bw = Math.min(blockSize, mw - bx);
          const bh = Math.min(blockSize, mh - by);
          let r = 0, g = 0, b = 0, count = 0;
          for (let px = 0; px < bw; px++) {
            for (let py = 0; py < bh; py++) {
              const idx = ((by + py) * mw + (bx + px)) * 4;
              r += imgData.data[idx];
              g += imgData.data[idx + 1];
              b += imgData.data[idx + 2];
              count++;
            }
          }
          ctx.fillStyle = `rgb(${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)})`;
          ctx.fillRect(mx + bx, my + by, bw, bh);
        }
      }
      break;
    }
  }
  ctx.restore();
}

// 均一な太さの矢印
function drawUniformArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, lw: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;
  const angle = Math.atan2(dy, dx);
  const headLen = Math.min(20, len * 0.4) + lw * 2;

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

// テーパー矢印（根元が細く先端に向かって太くなる、塗りつぶし、尖った先端）
function drawTaperedArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, lw: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;

  const nx = -dy / len; // 法線 x
  const ny = dx / len;  // 法線 y
  const headLen = Math.min(20, len * 0.35) + lw * 2;

  // シャフトの終端（矢頭の手前）
  const cosA = dx / len;
  const sinA = dy / len;
  const shaftEnd = {
    x: to.x - headLen * cosA,
    y: to.y - headLen * sinA,
  };

  const startW = Math.max(1, lw * 0.5);  // 根元の半幅
  const endW = lw * 1.5;                  // シャフト末端の半幅
  const headW = lw * 3.0;                 // 矢頭の半幅

  // シャフト + 矢頭を一体のパスで描画（先端が尖るように）
  ctx.save();
  ctx.lineJoin = "miter";
  ctx.miterLimit = 20;
  ctx.beginPath();
  // 根元の右側
  ctx.moveTo(from.x + nx * startW, from.y + ny * startW);
  // シャフト右側 → 矢頭右肩
  ctx.lineTo(shaftEnd.x + nx * endW, shaftEnd.y + ny * endW);
  ctx.lineTo(shaftEnd.x + nx * headW, shaftEnd.y + ny * headW);
  // 先端（尖る）
  ctx.lineTo(to.x, to.y);
  // 矢頭左肩 → シャフト左側
  ctx.lineTo(shaftEnd.x - nx * headW, shaftEnd.y - ny * headW);
  ctx.lineTo(shaftEnd.x - nx * endW, shaftEnd.y - ny * endW);
  // 根元の左側
  ctx.lineTo(from.x - nx * startW, from.y - ny * startW);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
