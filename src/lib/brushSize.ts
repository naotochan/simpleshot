import type { Tool } from "../types/annotation";

/** ブラシ太さ（画像の native 画素）の UI 範囲 */
export const BRUSH_SIZE_MIN = 1;
export const BRUSH_SIZE_MAX = 40;
export const BRUSH_SIZE_DEFAULT = 4;

export const HIGHLIGHTER_WIDTH_MUL = 8;
export const MOSAIC_BLOCK_MUL = 2.5;
export const MOSAIC_BLOCK_MIN = 8;
export const MOSAIC_BLOCK_MAX = 64;

/** 太さスライダー値 → テキスト描画のフォントサイズ（native px） */
export function textSizeFromBrush(brushSize: number): number {
  return brushSize * 6 + 12;
}

/** 太さスライダー値 → ハイライタ線幅（native px） */
export function highlighterWidthFromBrush(brushSize: number): number {
  return brushSize * HIGHLIGHTER_WIDTH_MUL;
}

/** 太さスライダー値 → モザイクブロックサイズ（native px） */
export function mosaicBlockFromBrush(brushSize: number): number {
  return Math.max(
    MOSAIC_BLOCK_MIN,
    Math.min(MOSAIC_BLOCK_MAX, Math.round(brushSize * MOSAIC_BLOCK_MUL))
  );
}

/** ツールに応じた実効サイズ（描画・プレビュー用、画像 px） */
export function effectiveSizeFromBrush(tool: Tool, brushSize: number): number {
  switch (tool) {
    case "text":
      return textSizeFromBrush(brushSize);
    case "highlighter":
      return highlighterWidthFromBrush(brushSize);
    case "mosaic":
      return mosaicBlockFromBrush(brushSize);
    default:
      return brushSize;
  }
}

export function sizeControlLabel(tool: Tool): string {
  switch (tool) {
    case "text":
      return "文字";
    case "highlighter":
      return "ハイライト";
    case "mosaic":
      return "粗さ";
    default:
      return "太さ";
  }
}

/** 塗りつぶし図形・パン・クロップでは太さ UI を出さない */
export function shouldShowSizeControl(tool: Tool, shapeFilled: boolean): boolean {
  if (tool === "hand" || tool === "crop") return false;
  if ((tool === "rect" || tool === "ellipse") && shapeFilled) return false;
  return true;
}

/** カーソル下のブラシプレビュー直径（不要なら null） */
export function brushPreviewDiameter(
  tool: Tool,
  brushSize: number,
  shapeFilled: boolean
): number | null {
  if (!shouldShowSizeControl(tool, shapeFilled)) return null;
  if (tool === "mosaic") return null;
  return effectiveSizeFromBrush(tool, brushSize);
}
