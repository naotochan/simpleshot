/** ブラシ太さ（画像の native 画素）の UI 範囲 */
export const BRUSH_SIZE_MIN = 1;
export const BRUSH_SIZE_MAX = 40;
export const BRUSH_SIZE_DEFAULT = 4;

/** 太さスライダー値 → テキスト描画のフォントサイズ（native px） */
export function textSizeFromBrush(brushSize: number): number {
  return brushSize * 6 + 12;
}
