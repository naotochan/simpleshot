import { useEffect, useRef, useState, useCallback } from "react";
import {
  captureRegion,
  doCaptureFullscreen,
  hideOverlay,
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

export default function Overlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("region");
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [hoveredWin, setHoveredWin] = useState<WindowInfo | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // オーバーレイ表示時にデフォルト状態にリセット
  const resetToDefault = useCallback(() => {
    setMode("region");
    setDrag(null);
    setDragging(false);
    setHoveredWin(null);
    setWindows([]);
  }, []);

  // オーバーレイが再表示されたときにリセット
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        resetToDefault();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [resetToDefault]);

  // Space でウィンドウ選択モードに切り替え
  const enterWindowMode = useCallback(async () => {
    setMode("window");
    setHoveredWin(null);
    try {
      const wins = await getWindowList();
      setWindows(wins);
    } catch {
      setWindows([]);
    }
  }, []);

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
        try { await captureWindowById(hoveredWin.id); } catch { /* ignore */ }
        resetToDefault();
      }
      // ウィンドウモードでは空白クリックは無視
      return;
    }
    // 範囲選択モード: ドラッグ開始
    if (mode === "region") {
      setDragging(true);
      setDrag({
        startX: e.clientX,
        startY: e.clientY,
        endX: e.clientX,
        endY: e.clientY,
      });
    }
  };

  // マウス移動
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    if (mode === "region" && dragging) {
      setDrag((d) =>
        d ? { ...d, endX: e.clientX, endY: e.clientY } : null
      );
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
      setHoveredWin(best);
    }
  };

  // マウスアップ → 範囲確定
  const handleMouseUp = (e: React.MouseEvent) => {
    if (mode !== "region" || !dragging || !drag) return;

    const x = Math.min(drag.startX, e.clientX);
    const y = Math.min(drag.startY, e.clientY);
    const w = Math.abs(e.clientX - drag.startX);
    const h = Math.abs(e.clientY - drag.startY);

    setDragging(false);

    if (w > 10 && h > 10) {
      captureRegion(Math.round(x), Math.round(y), Math.round(w), Math.round(h)).catch(() => {});
      resetToDefault();
    } else {
      // クリック（ドラッグなし） → 全画面キャプチャ
      setDrag(null);
      doCaptureFullscreen().catch(() => {});
      resetToDefault();
    }
  };

  // Canvas 描画
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    if (mode === "region") {
      // 暗いオーバーレイ
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, W, H);

      if (drag) {
        const x = Math.min(drag.startX, drag.endX);
        const y = Math.min(drag.startY, drag.endY);
        const w = Math.abs(drag.endX - drag.startX);
        const h = Math.abs(drag.endY - drag.startY);

        // 選択領域を透明に
        ctx.clearRect(x, y, w, h);

        // 青いボーダー
        ctx.strokeStyle = "#007AFF";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // 四隅のハンドル
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

        // サイズラベル
        if (w > 60 && h > 20) {
          const label = `${Math.round(w)} × ${Math.round(h)}`;
          ctx.font = "bold 12px -apple-system, sans-serif";
          const tw = ctx.measureText(label).width;
          const boxW = tw + 14;
          const boxH = 22;
          const bx = x + (w - boxW) / 2;
          const by = y + h + 6;

          ctx.fillStyle = "rgba(0, 122, 255, 0.9)";
          ctx.beginPath();
          ctx.roundRect(bx, by, boxW, boxH, 4);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.fillText(label, bx + 7, by + 15);
        }
      }
    } else if (mode === "window") {
      // 暗いオーバーレイ
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillRect(0, 0, W, H);

      if (hoveredWin) {
        const { x, y, w, h, name } = hoveredWin;

        // ウィンドウ領域を透明に
        ctx.clearRect(x, y, w, h);

        // 青い半透明オーバーレイ
        ctx.fillStyle = "rgba(0, 122, 255, 0.25)";
        ctx.fillRect(x, y, w, h);

        // 青い枠線
        ctx.strokeStyle = "#007AFF";
        ctx.lineWidth = 4;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

        // アプリ名ラベル
        ctx.font = "bold 13px -apple-system, sans-serif";
        const tw = ctx.measureText(name).width;
        const boxW = tw + 18;
        const boxH = 28;
        const bx = Math.max(4, x + (w - boxW) / 2);
        const by = y > boxH + 10 ? y - boxH - 8 : y + h + 8;

        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.beginPath();
        ctx.roundRect(bx, by, boxW, boxH, 6);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.fillText(name, bx + 9, by + 19);
      }

    }
  }, [mode, drag, hoveredWin]);

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ cursor: mode === "window" ? "none" : "crosshair" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* ウィンドウモード: Material Design カメラアイコン */}
      {mode === "window" && (
        <div
          className="absolute pointer-events-none"
          style={{ left: mousePos.x - 14, top: mousePos.y - 14 }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white" style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" }}>
            <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9Z" />
          </svg>
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
