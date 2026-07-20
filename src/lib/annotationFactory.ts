import type {
  Annotation,
  AnnotationColor,
  AnnotationTool,
  ArrowStyle,
  Point,
} from "../types/annotation";
import { effectiveSizeFromBrush } from "./brushSize";

export function createDrawingAnnotation(opts: {
  tool: AnnotationTool;
  color: AnnotationColor;
  brushSize: number;
  points: Point[];
  arrowStyle: ArrowStyle;
  shapeFilled: boolean;
}): Annotation {
  const size = effectiveSizeFromBrush(opts.tool, opts.brushSize);
  const base = { color: opts.color, size, points: opts.points };

  switch (opts.tool) {
    case "arrow":
      return { ...base, tool: "arrow", arrowStyle: opts.arrowStyle };
    case "rect":
      return { ...base, tool: "rect", filled: opts.shapeFilled };
    case "ellipse":
      return { ...base, tool: "ellipse", filled: opts.shapeFilled };
    case "pen":
      return { ...base, tool: "pen" };
    case "highlighter":
      return { ...base, tool: "highlighter" };
    case "mosaic":
      return { ...base, tool: "mosaic" };
    case "text":
      return { ...base, tool: "text", text: "" };
  }
}

export function withUpdatedPoints(ann: Annotation, points: Point[]): Annotation {
  return { ...ann, points } as Annotation;
}

export function shiftAnnotation(ann: Annotation, dx: number, dy: number): Annotation {
  return {
    ...ann,
    points: ann.points.map((p) => ({ x: p.x - dx, y: p.y - dy })),
  } as Annotation;
}
