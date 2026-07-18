import { useEffect, useRef, useState, useCallback } from "react";
import {
  captureRegion,
  doCaptureFullscreen,
  hideOverlay,
  showOverlay,
  getWindowList,
  captureWindowById,
  type WindowInfo,
} from "../lib/ipc";

type Mode = "region" | "window";

interface DragState {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

// ---- canvas paint helpers ----

function fillDimOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  alpha: number
) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, w, h);
}

function clearHole(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  ctx.clearRect(x, y, w, h);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  bx: number,
  by: number,
  opts: {
    font: string;
    padX: number;
    boxH: number;
    radius: number;
    bg: string;
    fg?: string;
  }
) {
  ctx.font = opts.font;
  const tw = ctx.measureText(text).width;
  const boxW = tw + opts.padX * 2;
  ctx.fillStyle = opts.bg;
  ctx.beginPath();
  ctx.roundRect(bx, by, boxW, opts.boxH, opts.radius);
  ctx.fill();
  ctx.fillStyle = opts.fg ?? "white";
  ctx.fillText(text, bx + opts.padX, by + opts.boxH * 0.68);
  return { boxW, boxH: opts.boxH };
}

function paintRegion(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  drag: DragState | null
) {
  fillDimOverlay(ctx, W, H, 0.3);
  if (!drag) return;

  const x = Math.min(drag.startX, drag.endX);
  const y = Math.min(drag.startY, drag.endY);
  const w = Math.abs(drag.endX - drag.startX);
  const h = Math.abs(drag.endY - drag.startY);

  clearHole(ctx, x, y, w, h);

  ctx.strokeStyle = "#007AFF";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  const hs = 6;
  ctx.fillStyle = "white";
  for (const [cx, cy] of [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ] as [number, number][]) {
    ctx.fillRect(cx - hs / 2, cy - hs / 2, hs, hs);
  }

  if (w > 60 && h > 20) {
    const label = `${Math.round(w)} × ${Math.round(h)}`;
    ctx.font = "bold 12px -apple-system, sans-serif";
    const boxW = ctx.measureText(label).width + 14;
    const bx = x + (w - boxW) / 2;
    const by = y + h + 6;
    drawLabel(ctx, label, bx, by, {
      font: "bold 12px -apple-system, sans-serif",
      padX: 7,
      boxH: 22,
      radius: 4,
      bg: "rgba(0, 122, 255, 0.9)",
    });
  }
}

function paintWindow(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  hoveredWin: WindowInfo | null
) {
  fillDimOverlay(ctx, W, H, 0.4);
  if (!hoveredWin) return;

  const { x, y, w, h, name } = hoveredWin;
  clearHole(ctx, x, y, w, h);

  ctx.fillStyle = "rgba(0, 122, 255, 0.25)";
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = "#007AFF";
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

  ctx.font = "bold 13px -apple-system, sans-serif";
  const tw = ctx.measureText(name).width;
  const boxW = tw + 18;
  const boxH = 28;
  const bx = Math.max(4, x + (w - boxW) / 2);
  const by = y > boxH + 10 ? y - boxH - 8 : y + h + 8;
  drawLabel(ctx, name, bx, by, {
    font: "bold 13px -apple-system, sans-serif",
    padX: 9,
    boxH: 28,
    radius: 6,
    bg: "rgba(0, 0, 0, 0.75)",
  });
}

export default function Overlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const hoveredWinRef = useRef<WindowInfo | null>(null);
  const modeRef = useRef<Mode>("region");
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressVisibilityResetRef = useRef(false);

  const [mode, setMode] = useState<Mode>("region");
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [hoveredWin, setHoveredWin] = useState<WindowInfo | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    } else {
      ctx.clearRect(0, 0, W, H);
    }

    if (modeRef.current === "region") {
      paintRegion(ctx, W, H, dragRef.current);
    } else {
      paintWindow(ctx, W, H, hoveredWinRef.current);
    }
  }, []);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      drawFrame();
    });
  }, [drawFrame]);

  const showCaptureError = useCallback((message = "キャプチャに失敗しました") => {
    setErrorMsg(message);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 2500);
  }, []);

  // オーバーレイ表示時にデフォルト状態にリセット
  const resetToDefault = useCallback(() => {
    setMode("region");
    modeRef.current = "region";
    dragRef.current = null;
    hoveredWinRef.current = null;
    setDragging(false);
    setHoveredWin(null);
    setWindows([]);
    setErrorMsg(null);
    scheduleDraw();
  }, [scheduleDraw]);

  const runCapture = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn();
        resetToDefault();
      } catch {
        showCaptureError();
        // capture コマンド側で overlay が隠れるため、失敗時は再表示してフィードバックを見せる
        suppressVisibilityResetRef.current = true;
        try {
          await showOverlay();
        } catch {
          /* ignore */
        }
        // visibilitychange が次フレーム付近で飛ぶ想定で短く抑制
        setTimeout(() => {
          suppressVisibilityResetRef.current = false;
        }, 100);
      }
    },
    [resetToDefault, showCaptureError]
  );

  // オーバーレイが再表示されたときにリセット（キャプチャ失敗の再表示は除く）
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (suppressVisibilityResetRef.current) return;
        resetToDefault();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [resetToDefault]);

  // 初回・リサイズ描画
  useEffect(() => {
    scheduleDraw();
    const onResize = () => scheduleDraw();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, [scheduleDraw]);

  // Space でウィンドウ選択モードに切り替え
  const enterWindowMode = useCallback(async () => {
    setMode("window");
    modeRef.current = "window";
    hoveredWinRef.current = null;
    setHoveredWin(null);
    scheduleDraw();
    try {
      const wins = await getWindowList();
      setWindows(wins);
    } catch {
      setWindows([]);
    }
  }, [scheduleDraw]);

  // キーボード操作
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      // Space → ウィンドウ選択モード
      if (e.code === "Space") {
        e.preventDefault();
        if (mode === "region" && !dragging) {
          enterWindowMode();
        }
        return;
      }
      // Escape
      if (e.key === "Escape") {
        e.preventDefault();
        if (mode === "window") {
          // ウィンドウモード → 範囲選択に戻る
          resetToDefault();
        } else {
          // 範囲選択モード → オーバーレイを閉じる
          await hideOverlay();
          resetToDefault();
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, dragging, resetToDefault, enterWindowMode]);

  // マウスダウン
  const handleMouseDown = async (e: React.MouseEvent) => {
    if (mode === "window") {
      if (hoveredWin) {
        await runCapture(() => captureWindowById(hoveredWin.id));
      }
      // ウィンドウモードでは空白クリックは無視
      return;
    }
    // 範囲選択モード: ドラッグ開始
    if (mode === "region") {
      setDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
      };
      scheduleDraw();
    }
  };

  // マウス移動
  const handleMouseMove = (e: React.MouseEvent) => {
    // カスタムカーソルは DOM 直更新（React state による再レンダーを避ける）
    if (cursorRef.current) {
      cursorRef.current.style.transform = `translate(${e.clientX - 14}px, ${e.clientY - 14}px)`;
    }

    if (mode === "region" && dragging && dragRef.current) {
      dragRef.current = {
        ...dragRef.current,
        endX: e.clientX,
        endY: e.clientY,
      };
      scheduleDraw();
      return;
    }

    if (mode === "window" && windows.length > 0) {
      const cx = e.clientX;
      const cy = e.clientY;
      let best: WindowInfo | null = null;
      let bestArea = Infinity;
      for (const w of windows) {
        if (cx >= w.x && cx <= w.x + w.w && cy >= w.y && cy <= w.y + w.h) {
          const area = w.w * w.h;
          if (area < bestArea) {
            bestArea = area;
            best = w;
          }
        }
      }
      if (best?.id !== hoveredWinRef.current?.id) {
        hoveredWinRef.current = best;
        setHoveredWin(best);
        scheduleDraw();
      }
    }
  };

  // マウスアップ → 範囲確定
  const handleMouseUp = (e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (mode !== "region" || !dragging || !drag) return;

    const x = Math.min(drag.startX, e.clientX);
    const y = Math.min(drag.startY, e.clientY);
    const w = Math.abs(e.clientX - drag.startX);
    const h = Math.abs(e.clientY - drag.startY);

    setDragging(false);

    if (w > 10 && h > 10) {
      void runCapture(() =>
        captureRegion(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
      );
    } else {
      // クリック（ドラッグなし） → 全画面キャプチャ
      dragRef.current = null;
      scheduleDraw();
      void runCapture(() => doCaptureFullscreen());
    }
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ cursor: mode === "window" ? "none" : "crosshair" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* ウィンドウモード: Material Design カメラアイコン（位置は ref で更新） */}
      {mode === "window" && (
        <div
          ref={cursorRef}
          className="absolute pointer-events-none left-0 top-0"
          style={{ willChange: "transform" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}>
            <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9Z" />
          </svg>
        </div>
      )}

      {/* キャプチャ失敗フィードバック */}
      {errorMsg && (
        <div
          className="absolute top-10 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-lg text-white select-none pointer-events-none"
          style={{
            background: "rgba(180, 40, 40, 0.9)",
            backdropFilter: "blur(8px)",
            whiteSpace: "nowrap",
            fontSize: "13px",
            zIndex: 10,
          }}
          role="status"
        >
          {errorMsg}
        </div>
      )}

      {/* ヒントバー */}
      <div
        className="absolute bottom-28 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-white select-none pointer-events-none"
        style={{
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(8px)",
          whiteSpace: "nowrap",
          fontSize: "13px",
        }}
      >
        {mode === "window"
          ? hoveredWin
            ? `${hoveredWin.name}  ｜  クリック: キャプチャ  ｜  Esc: 戻る`
            : `ウィンドウを選択 (${windows.length}件)  ｜  クリック: キャプチャ  ｜  Esc: 戻る`
          : "ドラッグ: 範囲選択  ｜  クリック: 全画面  ｜  Space: ウィンドウ選択  ｜  Esc: 閉じる"
        }
      </div>
    </div>
  );
}
