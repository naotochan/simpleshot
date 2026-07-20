import type { Annotation, Point } from "../types/annotation";

/** モザイク用の再利用キャンバス（毎描画の createElement を避ける） */
let mosaicTmp: HTMLCanvasElement | null = null;
function getMosaicTmp(sw: number, sh: number): HTMLCanvasElement {
  if (!mosaicTmp) mosaicTmp = document.createElement("canvas");
  if (mosaicTmp.width !== sw || mosaicTmp.height !== sh) {
    mosaicTmp.width = sw;
    mosaicTmp.height = sh;
  }
  return mosaicTmp;
}

export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  scale: number,
  imageCanvas?: HTMLCanvasElement | null
) {
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
      const mx = Math.round(Math.min(start.x, end.x));
      const my = Math.round(Math.min(start.y, end.y));
      const mw = Math.round(Math.abs(end.x - start.x));
      const mh = Math.round(Math.abs(end.y - start.y));
      if (mw < 2 || mh < 2) break;
      // ann.size は画像の native 画素。ブロックは見た目のモザイク感が出る範囲に収める
      const block = Math.max(8, Math.min(64, Math.round(ann.size * 2.5)));
      const sw = Math.max(1, Math.round(mw / block));
      const sh = Math.max(1, Math.round(mh / block));
      // 縮小 → 拡大（スムージング OFF）で一般的なピクセルモザイクにする
      const tmp = getMosaicTmp(sw, sh);
      const tctx = tmp.getContext("2d");
      if (!tctx) break;
      tctx.imageSmoothingEnabled = false;
      tctx.clearRect(0, 0, sw, sh);
      tctx.drawImage(imageCanvas, mx, my, mw, mh, 0, 0, sw, sh);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tmp, 0, 0, sw, sh, mx, my, mw, mh);
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

/** 均一な太さの矢印（丸い根元 + 塗りつぶし矢じり） */
export function drawUniformArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, lw: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;

  const angle = Math.atan2(dy, dx);
  const headLen = Math.min(len * 0.4, lw * 5 + 12);
  const headHalf = lw * 2.2 + 2;
  // 軸は矢じりの根元手前で止め、線が先端を突き抜けないようにする
  const shaftEnd = {
    x: to.x - Math.cos(angle) * headLen * 0.78,
    y: to.y - Math.sin(angle) * headLen * 0.78,
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(shaftEnd.x, shaftEnd.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle) + headHalf * Math.sin(angle),
    to.y - headLen * Math.sin(angle) - headHalf * Math.cos(angle)
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle) - headHalf * Math.sin(angle),
    to.y - headLen * Math.sin(angle) + headHalf * Math.cos(angle)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** テーパー矢印（丸い根元、先端に向かって太くなる） */
export function drawTaperedArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, lw: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;

  const nx = -dy / len;
  const ny = dx / len;
  const cosA = dx / len;
  const sinA = dy / len;

  const headLen = Math.min(len * 0.42, lw * 4.8 + 10);
  const shaftEnd = {
    x: to.x - headLen * cosA,
    y: to.y - headLen * sinA,
  };

  const startW = Math.max(lw * 0.45, 1.5);
  const endW = lw * 1.2;
  const headW = lw * 2.6;

  const a1 = Math.atan2(ny, nx);
  const a2 = Math.atan2(-ny, -nx);

  ctx.save();
  ctx.lineJoin = "miter";
  ctx.miterLimit = 20;
  ctx.beginPath();
  ctx.moveTo(from.x + nx * startW, from.y + ny * startW);
  ctx.lineTo(shaftEnd.x + nx * endW, shaftEnd.y + ny * endW);
  ctx.lineTo(shaftEnd.x + nx * headW, shaftEnd.y + ny * headW);
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(shaftEnd.x - nx * headW, shaftEnd.y - ny * headW);
  ctx.lineTo(shaftEnd.x - nx * endW, shaftEnd.y - ny * endW);
  ctx.lineTo(from.x - nx * startW, from.y - ny * startW);
  // 根元は半円（先端側ではなくお尻側を通る）
  ctx.arc(from.x, from.y, startW, a2, a1, true);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
