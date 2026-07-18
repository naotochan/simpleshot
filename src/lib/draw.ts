import type { Annotation, Point } from "../types/annotation";

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

/** 均一な太さの矢印 */
export function drawUniformArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, lw: number) {
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

/** テーパー矢印（根元が細く先端に向かって太くなる、塗りつぶし、尖った先端） */
export function drawTaperedArrow(ctx: CanvasRenderingContext2D, from: Point, to: Point, lw: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;

  const nx = -dy / len;
  const ny = dx / len;
  const headLen = Math.min(20, len * 0.35) + lw * 2;

  const cosA = dx / len;
  const sinA = dy / len;
  const shaftEnd = {
    x: to.x - headLen * cosA,
    y: to.y - headLen * sinA,
  };

  const startW = Math.max(1, lw * 0.5);
  const endW = lw * 1.5;
  const headW = lw * 3.0;

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
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
